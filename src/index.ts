import { parseQueryFromURL } from 'fastest-qs'
import type { TemplatedApp, HttpRequest, HttpResponse, RecognizedString } from 'uWebSockets.js'

type HttpMethod = 'get' | 'post' | 'options' | 'del' | 'patch' | 'put' | 'head' | 'connect' | 'trace' | 'any'

const DEFAULT_HTTP_METHODS = new Set<HttpMethod>(['get', 'post', 'options', 'del', 'patch', 'put', 'head', 'connect', 'trace', 'any'])

interface TransformCallbackOptions {
  httpMethods?: typeof DEFAULT_HTTP_METHODS
}

interface TransformedHandlerParams extends Omit<HttpRequest, 'getQuery'> {
  getQuery: () => Record<string, string>
  res: HttpResponse
}

export type WrappedTemplatedApp = Omit<TemplatedApp, HttpMethod> & {
  [Method in HttpMethod]: (pattern: RecognizedString, handler: (params: TransformedHandlerParams) => void | Promise<void>) => WrappedTemplatedApp
}

export const transformCallback = ({
  httpMethods = DEFAULT_HTTP_METHODS
}: TransformCallbackOptions = {}) => (app: TemplatedApp): WrappedTemplatedApp => {
  for (const httpMethod of httpMethods) {
    const originalBindMethod = app[httpMethod as HttpMethod].bind(app) as unknown as (pattern: RecognizedString, handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>) => WrappedTemplatedApp

    app[httpMethod as HttpMethod] = ((path: RecognizedString, handler: (params: TransformedHandlerParams) => void | Promise<void>): WrappedTemplatedApp => {
      return originalBindMethod(path, (res, req) => {
        handler({
          ...req,
          getQuery: () => parseQueryFromURL(req.getQuery()),
          res
        })
      })
    }) as unknown as typeof app[HttpMethod]
  }

  return app as unknown as WrappedTemplatedApp
}
