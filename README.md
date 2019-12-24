# Osprey Resources

[![NPM version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Greenkeeper badge](https://badges.greenkeeper.io/mulesoft-labs/osprey-resources.svg)](https://greenkeeper.io/)

Iterate over [RAML resources](https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md#resources-and-nested-resources) and generate a middleware router.

## Installation

```
npm install osprey-resources --save
```

## Usage

```js
const express = require('express')
const resources = require('osprey-resources')
const utils = require('./utils')

const app = express()

// Array.<webapi-parser.EndPoint>
const endPoints = utils.getEndPoints()

app.use(resources(
  endPoints,
  function (method, path) {
    return function (req, res, next) {
      res.end('hello, world!')
    }
  }
))
```

The resources function accepts two arguments. The array of `EndPoint` objects from [webapi-parser](https://github.com/raml-org/webapi-parser) model and a function that will generate the route for that path. Return `null` if the route should not be used.

## License

MIT license

[npm-image]: https://img.shields.io/npm/v/osprey-resources.svg?style=flat
[npm-url]: https://npmjs.org/package/osprey-resources
[downloads-image]: https://img.shields.io/npm/dm/osprey-resources.svg?style=flat
[downloads-url]: https://npmjs.org/package/osprey-resources
[travis-image]: https://img.shields.io/travis/mulesoft-labs/osprey-resources.svg?style=flat
[travis-url]: https://travis-ci.org/mulesoft-labs/osprey-resources
[coveralls-image]: https://img.shields.io/coveralls/mulesoft-labs/osprey-resources.svg?style=flat
[coveralls-url]: https://coveralls.io/r/mulesoft-labs/osprey-resources?branch=master
