import { parseQueryFromURL } from 'fastest-qs'
import type { TemplatedApp, HttpRequest, HttpResponse, RecognizedString } from 'uWebSockets.js'

type HttpMethod = 'get' | 'post' | 'options' | 'del' | 'patch' | 'put' | 'head' | 'connect' | 'trace' | 'any'

const DEFAULT_HTTP_METHODS = new Set<HttpMethod>(['get', 'post', 'options', 'del', 'patch', 'put', 'head', 'connect', 'trace', 'any'])

interface TransformCallbackOptions {
  /**
   * Apply transform callback to these HTTP methods
   * @default 'get | post | options | del | patch | put | head | connect | trace | any'
   */
  httpMethods?: typeof DEFAULT_HTTP_METHODS
}

interface TransformedHandlerParams extends Omit<HttpRequest, 'getQuery'> {
  getQuery: () => Record<string, string>
  body: {
    json: () => Promise<Record<string, unknown>>
  }
  res: HttpResponse & {
    wrap: (callback: () => void) => void
  }
}

export type WrappedTemplatedApp = Omit<TemplatedApp, HttpMethod> & {
  [Method in HttpMethod]: (pattern: RecognizedString, handler: (params: TransformedHandlerParams) => void | Promise<void>) => WrappedTemplatedApp
}

const readJsonBody = (res: HttpResponse): Promise<Record<string, unknown>> => {
  return new Promise((resolve, reject) => {
    let buffer = new Uint8Array(0)  // Buffer to accumulate data

    res.onData((chunk, isLast) => {
      const currentChunk = new Uint8Array(chunk)
      const newBuffer = new Uint8Array(buffer.length + currentChunk.length)
      newBuffer.set(buffer)
      newBuffer.set(currentChunk, buffer.length)
      buffer = newBuffer

      if (isLast) {
        try {
          const json = JSON.parse(Buffer.from(buffer).toString()) as Record<string, unknown>
          resolve(json)
        } catch {
          reject(new Error('Invalid JSON'))
        }
      }
    })

    res.onAborted(() => {
      reject(new Error('Request aborted'))
    })
  })
}

export const transformCallback = ({
  httpMethods = DEFAULT_HTTP_METHODS
}: TransformCallbackOptions = {}) => (app: TemplatedApp): WrappedTemplatedApp => {
  for (const httpMethod of httpMethods) {
    const originalBindMethod = app[httpMethod as HttpMethod].bind(app) as unknown as (pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>) => WrappedTemplatedApp

    app[httpMethod as HttpMethod] = ((path: RecognizedString, handler: (params: TransformedHandlerParams) => void | Promise<void>): WrappedTemplatedApp => {
      return originalBindMethod(path, (res, req) => {
        res.wrap = (callback: () => void) => {
          res.onAborted(() => {
            res.isAborted = true
          })
          res.cork(() => {
            if (!res.isAborted) {
              callback()
            }
          })
        }
        handler({
          ...req,
          getQuery: () => parseQueryFromURL(req.getQuery()),
          body: {
            json: () => readJsonBody(res)
          },
          res
        } as TransformedHandlerParams)
      })
    }) as unknown as typeof app[HttpMethod]
  }

  return app as unknown as WrappedTemplatedApp
}
