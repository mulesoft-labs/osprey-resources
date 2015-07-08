/* global describe, it */

require('es6-promise').polyfill()

var expect = require('chai').expect
var popsicle = require('popsicle')
var server = require('popsicle-server')
var router = require('osprey-router')
var finalhandler = require('finalhandler')
var resources = require('./')

describe('osprey resources', function () {
  it('should reject undefined resources', function () {
    var app = router()

    app.use(resources([
      {
        relativeUri: '/users',
        methods: [{
          method: 'get'
        }]
      }
    ], success))

    return popsicle('/unknown')
      .use(server(createServer(app)))
      .then(function (res) {
        expect(res.status).to.equal(404)
      })
  })

  it('should accept defined resources', function () {
    var app = router()

    app.use(resources([
      {
        relativeUri: '/users',
        methods: [{
          method: 'get'
        }]
      }
    ], success))

    return popsicle('/users')
      .use(server(createServer(app)))
      .then(function (res) {
        expect(res.body).to.equal('success')
        expect(res.status).to.equal(200)
      })
  })

  it('should support nested resources', function () {
    var app = router()

    app.use(resources([
      {
        relativeUri: '/users',
        resources: [{
          relativeUri: '/{userId}',
          methods: [{
            method: 'get'
          }]
        }]
      }
    ], success))

    return popsicle('/users/123')
      .use(server(createServer(app)))
      .then(function (res) {
        expect(res.body).to.equal('success')
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
