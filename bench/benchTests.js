const Benchmarkify = require('benchmarkify')
const impl = require('../impl')

const CONCURRENCY_LIMIT = 10
const WORK_SIZE = 10000

const items1 = generateItems(WORK_SIZE)
const items2 = generateItems(WORK_SIZE)
const items3 = generateItems(WORK_SIZE)
const items4 = generateItems(WORK_SIZE)
const items5 = generateItems(WORK_SIZE)

module.exports = {

	'mapLimit on any iterable with "real" concurrency': async (done) => {
		await impl.anyIterableConcurrent(items2, asyncMapper, CONCURRENCY_LIMIT)
		done()
	},

	'mapLimit on any iterable without concat': async (done) => {
		await impl.anyIterableNoConcat(items2, asyncMapper, CONCURRENCY_LIMIT)
		done()
	},

	'mapLimit on any iterable': async (done) => {
		await impl.anyIterable(items1, asyncMapper, CONCURRENCY_LIMIT)
		done()
	},

	'mapLimit will iterate over work chunk': async (done) => {
		await impl.iterateWorkChunk(items3, asyncMapper, CONCURRENCY_LIMIT)
		done()
	},

	'mapLimit will iterate over work chunk without concat': async (done) => {
		await impl.iterateWorkChunkNoConcat(items4, asyncMapper, CONCURRENCY_LIMIT)
		done()
	},
	
	'mapLimit will slice a work chunk': async (done) => {
		await impl.sliceWorkChunk(items5, asyncMapper, CONCURRENCY_LIMIT)
		done()
	},
	
	// 'simple promise.all': async (done) => {
	// 	const work = items.map(item => asyncMapper(item))
	// 	await Promise.all(work)
	// 	done()
	// }
}

function asyncMapper(value) {
	return new Promise((resolve) => {
		setImmediate(() => {
			resolve(value)
		})
	})
}

function generateItems(howMany) {
	const result = []
	for (let i = 0; i < howMany; i++) {
		result.push(i)
	}
	return result
}