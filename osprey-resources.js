var router = require('osprey-router');

/**
 * Expose `ospreyResources`.
 */
module.exports = ospreyResources;

/**
 * Accept resources and a handler function.
 *
 * @param  {Array}    resources
 * @param  {Function} handler
 * @return {Function}
 */
function ospreyResources (resources, handler) {
  return createResources(resources, '', handler);
}

/**
 * Create a middleware router that handles the resource.
 *
 * @param  {Array}    resources
 * @param  {String}   uri
 * @return {Function}
 */
function createResources (resources, uri, handler) {
  var app = router();

  if (!resources) {
    return app;
  }

  resources.forEach(function (resource) {
    var path = resource.relativeUri;
    var params = resource.uriParameters;

    app.use(path, params, createResource(resource, uri, handler));
  });

  return app;
}

/**
 * Create middleware for a single RAML resource and recursively nest children.
 *
 * @param  {Object}   resource
 * @param  {String}   uri
 * @return {Function}
 */
function createResource (resource, uri, handler) {
  var app = router();
  var methods = resource.methods;
  var resources = resource.resources;
  var relativeUri = uri + (resource.relativeUri || '');

  if (methods) {
    methods.forEach(function (method) {
      app[method.method]('/', handler(method, relativeUri));
    });
  }

  if (resources) {
    app.use(createResources(resources, relativeUri, handler));
  }

  return app;
}
