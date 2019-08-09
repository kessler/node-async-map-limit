# @kessler/async-map-limit

My implementation for doing async map with limit on concurrency.

`impl.js` contains my experiments in making this fast

`bench` compares them using two different benchmark modules

```js
const map = require('@kessler/async-map-limit')

main()

async function main() {
    // process the array, 2 items at a time 
    const result = await map([1, 2, 3, 4, 5, 6], asyncMapper, 2)
}

function asyncMapper(value) {
    return new Promise((resolve) => {
        setImmediate(() => resolve(value))
    })
}

```