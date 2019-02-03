const _cache = require('memory-cache')
const serviceCache = new _cache.Cache()

const default_services = require('../default_services.json')

default_services.forEach(service => serviceCache.put(service.id, service))

serviceCache.put('auth', {
  id: 'auth',
  name: 'auth',
  app: 'https://accounts.jannik.ml',
  cb: 'https://accounts.jannik.ml'
})

module.exports = {
  ...require('./on_add_delete.js')(serviceCache), // onAdd, onDelete
  get: require('./get.js')(serviceCache),
  register: require('./register.js')(serviceCache),
  public_key: require('./public_key.js'),
  serviceCache: serviceCache
}