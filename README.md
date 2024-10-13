# uws-wrapper
Wrapper of `uWebSockets.js` that adds:
- replace callback with context parameter: `app[method](<PATTERN>, (res, req) => { ... })` → `app[method](<PATTERN>, ({ ...req, res }) => { ... })`
- replace `res.getQuery` (contained in context paramter) method with query object (implemented with [fastest-qs](https://github.com/rtritto/fastest-qs)): `q=1&q2` → `{ q: 1, q: 2 }`

## Install
```sh
yarn add uws-wrapper
```


## Example
```ts
import { App } from 'uWebSockets.js'
import { transformCallback } from 'uws-wrapper'

const port = +(process.env.PORT || 3000)

const app = transformCallback({
  // Default HTTP methods: 'get', 'post', 'options', 'del', 'patch', 'put', 'head', 'connect', 'trace', 'any'
  httpMethods: new Set(['get', 'post'])
})(App())

app.listen(port, (listenSocket) => {
  if (listenSocket) {
    console.log(`Server running at http://localhost:${port}`)
  } else {
    console.log(`Failed to listen to port ${port}`)
  }
})
```
