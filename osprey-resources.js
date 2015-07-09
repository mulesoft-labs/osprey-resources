var router = require('osprey-router')

/**
 * Expose `ospreyResources`.
 */
module.exports = ospreyResources

/**
 * Accept resources and a handler function.
 *
 * @param  {Array}    resources
 * @param  {Function} handler
 * @return {Function}
 */
function ospreyResources (resources, handler) {
  return createResources(router(), resources, '', handler)
}

/**
 * Create a middleware router that handles the resource.
 *
 * @param  {Function} app
 * @param  {Array}    resources
 * @param  {String}   prefix
 * @param  {Function} handler
 * @return {Function}
 */
function createResources (app, resources, prefix, handler) {
  if (!Array.isArray(resources)) {
    return app
  }

  resources.forEach(function (resource) {
    createResource(app, resource, prefix, handler)
  })

  return app
}

/**
 * Create middleware for a single RAML resource and recursively nest children.
 *
 * @param  {Function} app
 * @param  {Object}   resource
 * @param  {String}   prefix
 * @param  {Function} handler
 * @return {Function}
 */
function createResource (app, resource, prefix, handler) {
  var methods = resource.methods
  var resources = resource.resources
  var params = resource.uriParameters
  var path = prefix + (resource.relativeUri || '')

  if (methods) {
    // TODO: Exit routers when handled: pillarjs/router#20
    methods.forEach(function (method) {
      var handle = handler(method, path)

      // Enable the ability to skip handlers by returning null.
      if (handle != null) {
        app[method.method](path, params, handle)
      }
    })
  }

  if (resources) {
    createResources(app, resources, path, handler)
  }

  return app
}
