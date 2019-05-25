const db = require('../db.js')
let registerTokenCacheIndex = 0

module.exports = (registerTokenCache) => (generateRegisterToken) => (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) res.status(500).json({ message: 'failed to validate user', status: 'failure' })
    if(user.account_type === 'admin') {
      const permanent = req.body.permanent !== undefined ? req.body.permanent : false
      const register_token = generateRegisterToken({
        id: registerTokenCacheIndex,
        timestamp: Date.now(),
        ...req.body, // this adds to additional information to the register token which is used when adding an account using a register token. 
        permanent: permanent,
        expireAt: permanent ? 0 : (req.body.expireAt || 30 * 60 * 1000),
      })

      registerTokenCache.put(registerTokenCacheIndex, register_token)

      res.json({ register_token: register_token, id: registerTokenCacheIndex++, message: 'successfully generated new Register-Token', status: 'success' })

    } else {
      res.status(403).json({ message: 'account not permitted', status: 'failure' })
    }
  })
}

// should register tokens be saved to a database? probably yes.