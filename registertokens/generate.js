const db = require('../db.js')
// this is not being used at the moment, this will not work in the current state
module.exports = () => (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) res.status(500).json({ message: 'failed to validate user'})
    if(user.account_type === 'admin') {
      const permanent = req.body.permanent !== undefined ? req.body.permanent : false
      const register_token = generateRegisterToken({
        id: registerTokenCacheIndex,
        timestamp: Date.now(),
        ...req.body,
        permanent: permanent,
        expireAt: permanent ? 0 : (req.body.expireAt || 30 * 60 * 1000),
      })

      registerTokenCache.put(registerTokenCacheIndex, register_token)

      res.json({ register_token: register_token, id: registerTokenCacheIndex++ })

    } else {
      res.status(403).json({ message: 'account not permitted' })
    }
  })
}