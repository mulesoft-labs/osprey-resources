/* global describe, it */

var expect = require('chai').expect
var popsicle = require('popsicle')
var server = require('popsicle-server')
var router = require('osprey-router')
var finalhandler = require('finalhandler')
var Promise = require('any-promise')
var resources = require('./')

describe('osprey resources', function () {
  it('should reject undefined resources', function () {
    var app = router()

    app.use(resources([{
      relativeUri: '/users',
      methods: [{
        method: 'get'
      }]
    }], success))

    return popsicle.request('/unknown')
      .use(server(createServer(app)))
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

    return popsicle.request('/users')
      .use(server(createServer(app)))
      .then(function (res) {
        expect(res.body).to.equal('success')
        expect(res.status).to.equal(200)
      })
  })

  it('should support nested resources', function () {
    var app = router()

    app.use(resources([{
      relativeUri: '/users',
      resources: [{
        relativeUri: '/{userId}',
        methods: [{
          method: 'get'
        }]
      }]
    }], success))

    return popsicle.request('/users/123')
      .use(server(createServer(app)))
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

    return popsicle.request('/users/abc')
      .use(server(createServer(app)))
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
      popsicle.request('/users').use(server(createServer(app))),
      popsicle.request('/users/123').use(server(createServer(app)))
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

    return popsicle.request('/users/new')
      .use(server(createServer(app)))
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

    return popsicle.request('/12345/files')
      .use(server(createServer(app)))
      .then(function (res) {
        expect(res.status).to.equal(200)
        expect(res.body).to.equal('/12345/files')
      })
      .then(function () {
        return popsicle.request('/abcde/files').use(server(createServer(app)))
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

    return popsicle.request('/root')
      .use(server(createServer(app)))
      .then(function (res) {
        expect(res.body).to.equal('1')
        expect(res.status).to.equal(200)
      })
  })
})

function createServer (router) {
  return function (req, res) {
    return router(req, res, finalhandler(req, res))
  }
}

function success () {
  return function (req, res) {
    res.end('success')
  }
}
