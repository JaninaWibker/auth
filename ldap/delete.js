const deleteUser = require('../db.js').User.delete

module.exports = (ldap) => (req, res, next) => {
  next()
}