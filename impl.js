module.exports.anyIterableConcurrent = mapLimitAnyIterableConcurrent
module.exports.anyIterableNoConcat = mapLimitAnyIterableNoConcat
module.exports.anyIterable = mapLimitAnyIterable
module.exports.sliceWorkChunk = mapLimitSliceWorkChunk
module.exports.iterateWorkChunk = mapLimitIterateWorkChunk
module.exports.iterateWorkChunkNoConcat = mapLimitIterateWorkChunkNoConcat

async function mapLimitAnyIterableConcurrent(items, mapper, limit) {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('limit must be an integer greater than 0')
	}

	// Accept any iterable (Array, Set, Map, generator, ...) by taking its
	// iterator. Fall back to items itself for a bare iterator (has next() but
	// no Symbol.iterator).
	const iterator = typeof items[Symbol.iterator] === 'function'
		? items[Symbol.iterator]()
		: items

	let concurrentOps = 0
	let position = 0
	let finished = false
	let errored = false
	const map = []

	return new Promise((res, rej) => {
		const dispatch = async () => {
			if (errored) return

			try {
				const { done, value } = iterator.next()
				if (done) {
					finished = true
					if (concurrentOps === 0) return res(map)
					return
				}

				// its important to increment before the async operation
				const myPosition = position++
				concurrentOps++
				map[myPosition] = await mapper(value)
				concurrentOps--
				dispatch()
			} catch (err) {
				// a synchronous throw from iterator.next()/mapper, or a rejected
				// mapper promise: surface it to the caller instead of swallowing.
				errored = true
				rej(err)
			}
		}

		for (let i = 0; i < limit && !finished; i++) {
			dispatch()
		}
	})
}

async function mapLimitAnyIterableNoConcat(items, mapper, limit) {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('limit must be an integer greater than 0')
	}

	let result = []
	let work = []
	let counter = 0

	for (let item of items) {
		work.push(mapper(item))
		if (++counter === limit) {
			(await Promise.all(work)).forEach(item => result.push(item))
			counter = 0
			work = []
		}
	}

	if (work.length > 0) {
		(await Promise.all(work)).forEach(item => result.push(item))
	}

	return result
}

async function mapLimitAnyIterable(items, mapper, limit) {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('limit must be an integer greater than 0')
	}

	let result = []
	let work = []
	let counter = 0

	for (let item of items) {
		work.push(mapper(item))
		if (++counter === limit) {
			result = result.concat(await Promise.all(work))
			counter = 0
			work = []
		}
	}

	if (work.length > 0) {
		result = result.concat(await Promise.all(work))
	}

	return result
}

async function mapLimitIterateWorkChunkNoConcat(items, mapper, limit) {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('limit must be an integer greater than 0')
	}

	const result = []

	for (let x = 0; x < items.length; x += limit) {
		await map(x, x + limit, result)
	}

	return result

	async function map(from, to, result) {
		const work = []

		for (let i = from; i < to && i < items.length; i++) {
			work.push(mapper(items[i]))
		}

		const chunk = await Promise.all(work)

		for (let j = 0; j < chunk.length; j++) {
			result[from + j] = chunk[j]
		}
	}
}

async function mapLimitIterateWorkChunk(items, mapper, limit) {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('limit must be an integer greater than 0')
	}

	let result = []

	for (let x = 0; x < items.length; x += limit) {
		result = result.concat(await map(items, x, x + limit))
	}

	return result

	function map(_items, from, to) {
		const work = []

		for (let i = from; i < to && i < _items.length; i++) {
			work.push(mapper(items[i]))
		}

		return Promise.all(work)
	}
}

async function mapLimitSliceWorkChunk(items, mapper, limit) {
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('limit must be an integer greater than 0')
	}
	
	let result = []

	for (let x = 0; x < items.length; x += limit) {
		result = result.concat(await map(items.slice(x, x + limit)))
	}

	return result

	function map(_items) {
		const work = []

		for (let i = 0; i < _items.length; i++) {
			work.push(mapper(_items[i]))
		}

		return Promise.all(work)
	}
}