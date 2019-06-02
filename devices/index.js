module.exports = {
  list: require('./list.js'),
  get: require('./get.js'),
  add: require('./add.js').addDevice,
  delete: require('./delete.js'),
  modify: require('./modify.js').modifyDevice,
  revoke: require('./revoke.js'),
  iplookup: require('./iplookup.js').iplookup,
}