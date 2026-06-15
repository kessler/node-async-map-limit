# @kessler/async-map-limit

A `Promise.all()` based implementation for doing async map with a limit on concurrency.

Like `Promise.all()`, but instead of starting every operation at once, it keeps at most `limit` operations in flight at any time. Useful when the mapper hits a rate-limited API, a connection pool, or anything else you don't want to flood.

## Install

```
npm install @kessler/async-map-limit
```

## Usage

```js
const map = require('@kessler/async-map-limit')

main()

async function main() {
    // process the array, 2 items at a time
    const result = await map([1, 2, 3, 4, 5, 6], asyncMapper, 2)
    // result === [1, 2, 3, 4, 5, 6]
}

function asyncMapper(value) {
    return new Promise((resolve) => {
        setImmediate(() => resolve(value))
    })
}
```

## API

### `map(iterable, mapper, limit)` → `Promise<Array>`

- **`iterable`** — any iterable: an `Array`, `Set`, `Map`, generator, etc.
- **`mapper(item)`** — function called with each item; may return a value or a promise.
- **`limit`** — maximum number of concurrent `mapper` calls. Must be an integer `>= 1`.

Returns a promise that resolves to an array of results in the **same order as the input**, regardless of which operations finish first. The result length matches the number of items, and falsy results (`0`, `''`, `false`, `null`) are preserved.

#### Errors

- If `limit` is not an integer `>= 1`, the call throws synchronously (`limit must be an integer greater than 0`).
- If any `mapper` call rejects, the returned promise rejects with that error and no further items are dispatched.

## Notes

`impl.js` contains several experimental implementations of concurrency-limited map. The default export (`map` above) is `anyIterableConcurrent`, which does true sliding-window concurrency — as soon as one operation finishes, the next starts. The others use batched chunks (a whole batch of `limit` must finish before the next batch begins).

`bench` compares all of them using two different benchmark modules (`npm run bench`).
