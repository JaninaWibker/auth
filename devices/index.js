if(process.env.IP_LOOKUP_ENDPOINT === undefined || process.env.IP_LOOKUP_ENDPOINT === '') console.log('[iplookup] ip-lookup is disabled. To enable add an endpoint in .env (IP_LOOKUP_ENDPOINT)')

module.exports = {
  list: require('./list.js'),
  get: require('./get.js'),
  add: require('./add.js').addDevice,
  delete: require('./delete.js'),
  modify: require('./modify.js').modifyDevice,
  revoke: require('./revoke.js'),
  iplookup: require('./iplookup.js').iplookup,
}