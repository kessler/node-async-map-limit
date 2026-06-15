const test = require('ava')

const { MersenneTwister19937, Random } = require('random-js')
const impl = require('./impl')
const random = new Random(MersenneTwister19937.autoSeed())

for (let implName in impl) {
	test(`maps an array using a mapper function with concurrency restriction (${implName})`, async (t) => {
		const arr = [1, 2, 3, 4, 5, 6, 7, 8]
		const result = await impl[implName](arr, asyncMapper, 3)
		t.deepEqual(arr, result)
	})
}

for (let implName in impl) {
	test(`long operation in the middle (${implName})`, async (t) => {
		const arr = [1, 2, 3, 4, 5, 6, 7, 8]
		const result = await impl[implName](arr, asyncMapperLong, 4)
		t.deepEqual(arr, result)
	})
}

for (let implName in impl) {
	test(`when concurrency is set to 1 then the execution is serial (${implName})`, async (t) => {
		const mutex = { isRunning: false }
		const arr = [1, 2, 3, 4, 5, 7, 8]
		const result = await impl[implName](arr, makeSureItsSerial(mutex), 1)
		t.deepEqual(arr, result)
	})
}

for (let implName in impl) {
	test(`when iterable is empty the result is empty (${implName})`, async (t) => {
		const mutex = { isRunning: false }
		const arr = []
		const result = await impl[implName](arr, asyncMapper, 1)
		t.deepEqual(arr, result)
	})
}

// --- bug tests for the public export (anyIterableConcurrent) ---
// Each asserts the CORRECT behavior: a pass means there is no bug,
// a fail means the bug is real.
const map = impl.anyIterableConcurrent

// Race a promise against a timeout so a hanging call fails fast instead of stalling.
async function settle(promise, ms = 500) {
	let timer
	const timeout = new Promise((resolve) => {
		timer = setTimeout(() => resolve({ status: 'timeout' }), ms)
	})
	const wrapped = Promise.resolve(promise).then(
		(value) => ({ status: 'resolved', value }),
		(error) => ({ status: 'rejected', error })
	)
	const out = await Promise.race([wrapped, timeout])
	clearTimeout(timer)
	return out
}

// BUG 1: falsy mapper results (0, '', false, null) are dropped, leaving holes.
test('preserves falsy mapper results', async (t) => {
	const result = await map([0, 1, 2, 3], (x) => Promise.resolve(x * 2), 2)
	t.deepEqual(result, [0, 2, 4, 6])
})

// BUG 1b: a single falsy result should occupy its slot, not become a hole.
test('a falsy result occupies its slot, not a hole', async (t) => {
	const result = await map([1, 2, 3], (x) => Promise.resolve(x === 2 ? false : x), 2)
	t.deepEqual(result, [1, false, 3])
})

// BUG 2: a rejecting mapper should reject the returned promise.
test('propagates mapper rejection', async (t) => {
	const s = await settle(map([1, 2, 3], () => Promise.reject(new Error('boom')), 2))
	t.is(s.status, 'rejected')
	t.is(s.error && s.error.message, 'boom')
})

// BUG 3: an invalid limit of 0 should reject, not hang forever.
test('rejects on limit = 0 instead of hanging', async (t) => {
	const s = await settle(map([1, 2, 3], (x) => Promise.resolve(x), 0))
	t.is(s.status, 'rejected')
})

// BUG 4: a negative limit should reject, not hang forever.
test('rejects on negative limit instead of hanging', async (t) => {
	const s = await settle(map([1, 2, 3], (x) => Promise.resolve(x), -1))
	t.is(s.status, 'rejected')
})

// BUG 5: named "anyIterable" but a non-array iterable (Set) is not turned into
// an iterator, so .next() blows up.
test('accepts a non-array iterable (Set)', async (t) => {
	const s = await settle(map(new Set([1, 2, 3]), (x) => Promise.resolve(x), 2))
	t.is(s.status, 'resolved')
	t.deepEqual(s.value, [1, 2, 3])
})

// CONTROL: a generator IS an iterator, so this should already work (expected PASS).
test('accepts a generator/iterator', async (t) => {
	function* gen() { yield 1; yield 2; yield 3 }
	const result = await map(gen(), (x) => Promise.resolve(x), 2)
	t.deepEqual(result, [1, 2, 3])
})

function asyncMapper(value) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(value)
		}, random.integer(10, 600))
	})
}

function asyncMapperLong(value) {
	if (value !== 5) return asyncMapper(value)
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(value)
		}, 2000)
	})
}

function makeSureItsSerial(mutex) {
	return (value) => {
		return new Promise((resolve) => {
			if (mutex.isRunning) {
				throw new Error('should not be running')
			}
			mutex.isRunning = true
			setTimeout(() => {
				mutex.isRunning = false
				resolve(value)
			}, random.integer(10, 600))
		})
	}
}