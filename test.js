/* global describe, it */

var expect = require('chai').expect
var router = require('osprey-router')
var Promise = require('any-promise')
var resources = require('./')

/* Helps using popsicle-server with popsicle version 12+.
 *
 * Inspired by popsicle 12.0+ code.
 */
function makeFetcher (app) {
  var compose = require('throwback').compose
  var Request = require('servie').Request
  var popsicle = require('popsicle')
  var popsicleServer = require('popsicle-server').server
  var finalhandler = require('finalhandler')

  // Set response text to "body" property to mimic popsicle v10
  // response interface.

  function responseBodyMiddleware (req, next) {
    return next().then(res => {
      return res.text().then(body => {
        res.body = body
        return res
      })
    })
  }

  function createServer (router) {
    return function (req, res) {
      router(req, res, finalhandler(req, res))
    }
  }

  var popsicleServerMiddleware = popsicleServer(createServer(app))
  var middleware = compose([
    responseBodyMiddleware,
    popsicleServerMiddleware,
    popsicle.middleware
  ])

  return {
    fetch: popsicle.toFetch(middleware, Request)
  }
}

describe('osprey resources', function () {
  it('should reject undefined resources', function () {
    var app = router()

    app.use(resources([{
      relativeUri: '/users',
      methods: [{
        method: 'get'
      }]
    }], success))

    return makeFetcher(app).fetch('/unknown', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.status).to.equal(404)
      })
  })

  it('should receive path', function (done) {
    resources([{
      relativeUri: '/users',
      methods: [{
        method: 'post'
      }]
    }], function (method, path) {
      expect(path).to.equal('/users')
      expect(method.method).to.equal('post')

      done()

      return function () {}
    })
  })

  it('should accept defined resources', function () {
    var app = router()

    app.use(resources([{
      relativeUri: '/users',
      methods: [{
        method: 'get'
      }]
    }], success))

    return makeFetcher(app).fetch('/users', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.body).to.equal('success')
        expect(res.status).to.equal(200)
      })
  })

  it('should support nested resources', function () {
    var app = router()
    var resourceHandler = resources([{
      relativeUri: '/users',
      resources: [{
        relativeUri: '/{userId}',
        uriParameters: {
          userId: {
            type: 'number'
          }
        },
        methods: [{
          method: 'get'
        }]
      }]
    }], success)

    app.use(resourceHandler)

    expect(resourceHandler.ramlUriParameters).to.deep.equal({
      userId: {
        type: 'number'
      }
    })

    return makeFetcher(app).fetch('/users/123', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.body).to.equal('success')
        expect(res.status).to.equal(200)
      })
  })

  it('should use uri parameters', function () {
    var app = router()

    app.use(resources([
      {
        relativeUri: '/users/{userId}',
        uriParameters: {
          userId: {
            type: 'number'
          }
        },
        methods: [
          {
            method: 'get'
          }
        ]
      }
    ], success))

    return makeFetcher(app).fetch('/users/abc', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.status).to.equal(404)
      })
  })

  it('should skip handlers that return null', function () {
    var app = router()

    app.use(resources([
      {
        relativeUri: '/users',
        methods: [
          {
            method: 'get'
          }
        ],
        resources: [
          {
            relativeUri: '/{userId}',
            methods: [
              {
                method: 'get'
              }
            ]
          }
        ]
      }
    ], function (method, path) {
      return path === '/users' ? null : success()
    }))

    return Promise.all([
      makeFetcher(app).fetch('/users', {
        method: 'GET'
      }),
      makeFetcher(app).fetch('/users/123', {
        method: 'GET'
      })
    ])
      .then(function (responses) {
        expect(responses[0].status).to.equal(404)
        expect(responses[1].status).to.equal(200)
      })
  })

  it('should emit a single router to support `next(\'route\')`', function () {
    var app = router()

    app.use(resources([
      {
        relativeUri: '/users',
        resources: [
          {
            relativeUri: '/{userId}',
            methods: [
              {
                method: 'get'
              }
            ]
          },
          {
            relativeUri: '/new',
            methods: [
              {
                method: 'get'
              }
            ]
          }
        ]
      }
    ], function (method, path) {
      return path === '/users/{userId}' ? function (req, res, next) {
        return next('route')
      } : success()
    }))

    return makeFetcher(app).fetch('/users/new', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.status).to.equal(200)
        expect(res.body).to.equal('success')
      })
  })

  it('use uri parameters correctly', function () {
    var app = router()

    app.use(resources([
      {
        relativeUri: '/{userId}',
        uriParameters: {
          userId: {
            type: 'integer'
          }
        },
        resources: [
          {
            relativeUri: '/files',
            methods: [
              {
                method: 'get'
              }
            ]
          }
        ]
      }
    ], function (method, path) {
      return function (req, res) {
        return res.end(req.url)
      }
    }))

    return makeFetcher(app).fetch('/12345/files', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.status).to.equal(200)
        expect(res.body).to.equal('/12345/files')
      })
      .then(function () {
        return makeFetcher(app).fetch('/abcde/files', {
          method: 'GET'
        })
      })
      .then(function (res) {
        expect(res.status).to.equal(404)
      })
  })

  it('should exit router after first handler', function () {
    var app = router()

    app.use(resources([
      {
        relativeUri: '/root',
        methods: [
          {
            method: 'get'
          }
        ]
      },
      {
        relativeUri: '/{id}',
        methods: [
          {
            method: 'get'
          }
        ]
      }
    ], function (method, path) {
      return function (req, res, next) {
        req.hits = (req.hits + 1) || 1
        return next()
      }
    }), function (req, res) {
      res.end(String(req.hits))
    })

    return makeFetcher(app).fetch('/root', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.body).to.equal('1')
        expect(res.status).to.equal(200)
      })
  })
})

function success () {
  return function (req, res) {
    res.end('success')
  }
}
