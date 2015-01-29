var router = require('osprey-router');
var handler = require('osprey-method-handler');
var createError = require('http-errors');

/**
 * Expose `createResources`.
 */
module.exports = createResources;

/**
 * Create a middleware router that handles the resource.
 *
 * @param  {Array}    resources
 * @param  {String}   uri
 * @return {Function}
 */
function createResources (resources, uri) {
  var app = router();

  uri = uri || '';

  resources.forEach(function (resource) {
    var path = resource.relativeUri;
    var params = resource.uriParameters;

    app.use(path, params, createResource(resource, uri));
  });

  app.use(function (req, res, next) {
    if (req.resourcePath) {
      return next();
    }

    return next(new createError.NotFound());
  });

  return app;
}

/**
 * Create a single resource middleware.
 *
 * @param  {Object}   resource
 * @param  {String}   uri
 * @return {Function}
 */
function createResource (resource, uri) {
  var app = router();
  var methods = resource.methods;
  var resources = resource.resources;
  var relativeUri = uri + (resource.relativeUri || '');

  function route (req, res, next) {
    req.resourcePath = relativeUri;

    return next();
  }

  if (methods) {
    methods.forEach(function (method) {
      app[method.method]('/', route, handler(method));
    });
  }

  if (resources) {
    app.use(createResources(resources, relativeUri));
  }

  return app;
}
