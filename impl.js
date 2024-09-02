module.exports.anyIterableConcurrent = mapLimitAnyIterableConcurrent
module.exports.anyIterableNoConcat = mapLimitAnyIterableNoConcat
module.exports.anyIterable = mapLimitAnyIterable
module.exports.sliceWorkChunk = mapLimitSliceWorkChunk
module.exports.iterateWorkChunk = mapLimitIterateWorkChunk
module.exports.iterateWorkChunkNoConcat = mapLimitIterateWorkChunkNoConcat

async function mapLimitAnyIterableConcurrent(items, mapper, limit) {
	if (typeof limit !== 'number') {
		throw new Error('must provide limit argument')
	}

	if (Array.isArray(items)) {
		items = items.values()
	}

	let concurrentOps = 0
	let position = 0
	let finished = false
	const map = []

	return new Promise(res => {
		const dispatch = async () => {
			const { done, value } = items.next()
			if (done) {
				finished = done
				if (concurrentOps === 0) return res(map)
				return
			}

			// its important to increment before the async operation
			const myPosition = position++
			concurrentOps++
			const mapResult = await mapper(value)
			if (mapResult) {
				map[myPosition] = mapResult
			}
			concurrentOps--
			dispatch()
		}

		for (let i = 0; i < limit && !finished; i++) {
			dispatch()
		}
	})
}

async function mapLimitAnyIterableNoConcat(items, mapper, limit) {
	if (typeof limit !== 'number') {
		throw new Error('must provide limit argument')
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
	if (typeof limit !== 'number') {
		throw new Error('must provide limit argument')
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
	if (typeof limit !== 'number') {
		throw new Error('must provide limit argument')
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
	if (typeof limit !== 'number') {
		throw new Error('must provide limit argument')
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
	if (typeof limit !== 'number') {
		throw new Error('must provide limit argument')
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