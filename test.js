/* global describe, it, before */

const expect = require('chai').expect
const router = require('osprey-router')
const Promise = require('any-promise')
const wp = require('webapi-parser')

const ospreyResources = require('./')

/* Helps using popsicle-server with popsicle version 12+.
 *
 * Inspired by popsicle 12.0+ code.
 */
function makeFetcher (app) {
  const compose = require('throwback').compose
  const Request = require('servie').Request
  const popsicle = require('popsicle')
  const popsicleServer = require('popsicle-server')
  const finalhandler = require('finalhandler')

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

  const popsicleServerMiddleware = popsicleServer(createServer(app))
  const middleware = compose([
    responseBodyMiddleware,
    popsicleServerMiddleware,
    popsicle.middleware
  ])

  return {
    fetch: popsicle.toFetch(middleware, Request)
  }
}

before(async function () {
  await wp.WebApiParser.init()
})

describe('osprey resources', function () {
  it('should reject undefined resources', function () {
    const app = router()
    const endpoints = [
      new wp.model.domain.EndPoint()
        .withPath('/users')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ])
    ]
    app.use(ospreyResources(endpoints, success))

    return makeFetcher(app).fetch('/unknown', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.status).to.equal(404)
      })
  })

  it('should receive path', function (done) {
    const endpoints = [
      new wp.model.domain.EndPoint()
        .withPath('/users')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('POST')
        ])
    ]
    ospreyResources(endpoints, function (method, path) {
      expect(path).to.equal('/users')
      expect(method.method.value()).to.equal('post')

      done()

      return function () {}
    })
  })

  it('should accept defined resources', function () {
    const app = router()
    const endpoints = [
      new wp.model.domain.EndPoint()
        .withPath('/users')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ])
    ]
    app.use(ospreyResources(endpoints, success))

    return makeFetcher(app).fetch('/users', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.body).to.equal('success')
        expect(res.status).to.equal(200)
      })
  })

  it('should support nested resources', function () {
    const app = router()
    const endpoints = [
      new wp.model.domain.EndPoint()
        .withPath('/users'),
      new wp.model.domain.EndPoint()
        .withPath('/users/{userId}')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ])
        .withParameters([
          new wp.model.domain.Parameter()
            .withName('userId')
            .withRequired(true)
            .withSchema(
              new wp.model.domain.ScalarShape()
                .withName('schema')
                .withDataType('http://a.ml/vocabularies/shapes#number'))
        ])
    ]

    const resourceHandler = ospreyResources(endpoints, success)

    app.use(resourceHandler)

    expect(resourceHandler.ramlUriParameters).to.deep.equal({
      userId: {
        displayName: 'userId',
        name: 'userId',
        required: true,
        type: ['number']
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
    const app = router()
    const endpoints = [
      new wp.model.domain.EndPoint()
        .withPath('/users/{userId}')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ])
        .withParameters([
          new wp.model.domain.Parameter()
            .withName('userId')
            .withRequired(true)
            .withSchema(
              new wp.model.domain.ScalarShape()
                .withName('schema')
                .withDataType('http://a.ml/vocabularies/shapes#number'))
        ])
    ]

    app.use(ospreyResources(endpoints, success))

    return makeFetcher(app).fetch('/users/abc', {
      method: 'GET'
    })
      .then(function (res) {
        expect(res.status).to.equal(404)
      })
  })

  it('should skip handlers that return null', function () {
    const app = router()
    const endpoints = [
      new wp.model.domain.EndPoint()
        .withPath('/users')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ]),
      new wp.model.domain.EndPoint()
        .withPath('/users/{userId}')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ])
    ]

    app.use(ospreyResources(endpoints, function (method, path) {
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
    const app = router()
    const endpoints = [
      new wp.model.domain.EndPoint()
        .withPath('/users'),
      new wp.model.domain.EndPoint()
        .withPath('/users/{userId}')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ]),
      new wp.model.domain.EndPoint()
        .withPath('/users/new')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ])
    ]

    app.use(ospreyResources(endpoints, function (method, path) {
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
    const app = router()
    const endpoints = [
      new wp.model.domain.EndPoint()
        .withPath('/{userId}')
        .withParameters([
          new wp.model.domain.Parameter()
            .withName('userId')
            .withRequired(true)
            .withSchema(
              new wp.model.domain.ScalarShape()
                .withName('schema')
                .withDataType('http://www.w3.org/2001/XMLSchema#integer'))
        ]),
      new wp.model.domain.EndPoint()
        .withPath('/{userId}/files')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ])
        .withParameters([
          new wp.model.domain.Parameter()
            .withName('userId')
            .withRequired(true)
            .withSchema(
              new wp.model.domain.ScalarShape()
                .withName('schema')
                .withDataType('http://www.w3.org/2001/XMLSchema#integer'))
        ])
    ]

    app.use(ospreyResources(endpoints, function (method, path) {
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
    const app = router()
    const endpoints = [
      new wp.model.domain.EndPoint()
        .withPath('/root')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ]),
      new wp.model.domain.EndPoint()
        .withPath('/{id}')
        .withOperations([
          new wp.model.domain.Operation()
            .withMethod('GET')
        ])
    ]

    app.use(ospreyResources(endpoints, function (method, path) {
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
