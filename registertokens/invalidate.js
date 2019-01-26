const db = require('../db.js')

module.exports = (registerTokenCache) => (validateRegisterToken) => (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) res.status(500).json({ message: 'failed to validate user' })
    if(user.account_type === 'admin') {
      if(req.body.id || req.body.register_token) {
        if(req.body.id) {
          registerTokenCache.del(req.body.id)
          res.json({ message: 'register token invalidated successfully' })
        } else {
          registerTokenCache.del(validateRegisterToken(req.body.register_token).id)
          res.json({ message: 'register token invalidated successfully' })
        }
      } else {
        res.status(500).json({ message: 'supply register token id or token' })
      }
    } else {
      res.status(403).json({ message: 'account not permitted' })
    }
  })
}