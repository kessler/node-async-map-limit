# @kessler/async-map-limit

My implementation for doing async map with limit on concurrency.

Tried several implementations, the biggest performance leap so far came from not using concat

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