# uws-wrapper

Plugin for [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) that wraps _App_ instance to improve DX (Developer Experience).

Changes/Features:
- replace the parameters in the callback of the http request functions with a context object (rest all `req` and re-export `res`):

  ```diff
  -app[<HTTP_METHOD>](<ROUTE_PATTERN>, (res, req) => { ... })
  +app[<HTTP_METHOD>](<ROUTE_PATTERN>, ({ ...req, res }) => { ... })
  ```
- replace the result of `res.getQuery` method (contained in the context object as `{ getQuery }`) with a query object (implemented with [fastest-qs](https://github.com/rtritto/fastest-qs)):

  ```diff
  -q=1&q2
  +{ q: 1, q: 2 }
  ```

## Installation
```sh
yarn add uws-wrapper
```

## Usage

### Register the Plugin
```ts
import { App } from 'uWebSockets.js'
import { transformCallback } from 'uws-wrapper'

const port = +(process.env.PORT || 3000)

// Register the Plugin
const app = transformCallback({
  // Default HTTP methods: 'get', 'post', 'options', 'del', 'patch', 'put', 'head', 'connect', 'trace', 'any'
  httpMethods: new Set(['get', 'post'])
})(App())

// Usage
app
  .get(pattern, async ({ getQuery, res }) => {
    console.log('Query:', getQuery())
    res.end('Hello World!')
  })
  .listen(port, (listenSocket) => {
    if (listenSocket) {
      console.log(`Server running at http://localhost:${port}`)
    } else {
      console.log(`Failed to listen to port ${port}`)
    }
  })
```
