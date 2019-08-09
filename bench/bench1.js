const Benchmarkify = require('benchmarkify')
const tests = require('./benchTests')
const benchmark = new Benchmarkify('async map').printHeader()

const bench = benchmark.createSuite('async mapping')
const testNames = Object.keys(tests)

for (let i = 0; i < testNames.length; i++) {
	const testName= testNames[i]
	if (i === 0) {
		bench.ref(testName, tests[testName])
	} else {
		bench.add(testName, tests[testName])
	}
}

bench.run()
