const _cache = require('memory-cache')
const registerTokenCache = new _cache.Cache()

module.exports = {
  validate: require('./validate.js')(registerTokenCache),
  invalidate: require('./invalidate.js')(registerTokenCache),
  generate: require('./generate.js')(registerTokenCache),
  registerTokenCache: registerTokenCache
}