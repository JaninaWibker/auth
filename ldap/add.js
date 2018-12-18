const db = require('../db.js')

const addUser = db.User.add
const getUser = db.User.exist

module.exports = (ldap) => (req, res, next) => {
  if(!req.dn.rdns[0].cn)
    return next(new ldap.ConstraintViolationError('cn required'))
  
  getUser.byUsername(req.dn.rdns[0].cn, (exists) => {
    if(exists) next(new ldap.EntryAlreadyExistsError(req.dn.toString()))
    else {
      console.log(req.dn.rdns)
      res.end()
      next()
    }
  })
}