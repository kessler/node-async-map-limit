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


function asyncMapper(value) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(value)
		}, random.integer(10, 600))
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