const authenticateUser = require('../db.js').User.authenticate

module.exports = (ldap) => (req, res, next) => {
  res.end()
  next()
}