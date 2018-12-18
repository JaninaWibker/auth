const getUser = require('../db.js').User.get

module.exports = (ldap) => (req, res, next) => {
  next()
}