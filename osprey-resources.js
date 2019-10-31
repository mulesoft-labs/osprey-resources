const router = require('osprey-router')

/**
 * Expose `ospreyResources`.
 */
module.exports = ospreyResources

/**
 * Accept endpoints and a handler function.
 *
 * @param  {Array<webapi-parser.EndPoint>} endpoints
 * @param  {Function} handler
 * @return {Function}
 */
function ospreyResources (endpoints, handler) {
  return createResources(router(), endpoints, handler)
}

/**
 * Create a middleware router that handles a resource.
 *
 * @param  {Function} app
 * @param  {Array<webapi-parser.EndPoint>} endpoints
 * @param  {Function} handler
 * @return {Function}
 */
function createResources (app, endpoints, handler) {
  if (Array.isArray(endpoints)) {
    endpoints.forEach(endpoint => {
      createResource(app, endpoint, handler)
    })
  }
  return app
}

/**
 * Create middleware for a single RAML resource and recursively nest children.
 *
 * @param  {Function} app
 * @param  {webapi-parser.EndPoint} endpoint
 * @param  {Function} handler
 * @return {Function}
 */
function createResource (app, endpoint, handler) {
  const methods = endpoint.operations || []
  const path = endpoint.path.value()

  methods.forEach(method => {
    // Make method name lowercase so it matches names from
    // osprey-router.
    method.withMethod(method.method.value().toLowerCase())
    const handle = handler(method, path)

    // Enables the ability to skip a handler by returning null.
    if (handle) {
      app[method.method.value()](
        path, endpoint.parameters, handle, exitRouter)
    }
  })
  return app
}

/**
 * Exit the router implementation.
 */
function exitRouter (req, res, next) {
  return next('router')
}
