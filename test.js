const { MersenneTwister19937, Random } = require('random-js')
const test = require('ava')
const impl = require('./impl')
const random = new Random(MersenneTwister19937.autoSeed())

for (let implName in impl) {
	test(`maps an array using a mapper function with concurrency restriction (${implName})`, async (t) => {
		const arr = [1, 2, 3, 4, 5, 7, 8]
		const result = await impl[implName](arr, asyncMapper, 3)
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
