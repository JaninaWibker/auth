const db = require('../db.js')

const sendFailureNotPermitted = (res) => res.status(403).json({
  message: 'account not permitted', status: 'failure'
})

const sendSuccess = (res, register_tokens, count) => res.status(200).json({
  register_tokens: register_tokens,
  count: count,
  message: 'retrieving register token list successful',
  status: 'success'
})

module.exports = (registerTokenCache) => () => (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) res.status(500).json({ message: 'failed to validate user', status: 'failure' })
    if(user.account_type === 'admin') {
      const keys = registerTokenCache.keys()
      const obj = {}

      for(let i = 0; i < keys.length; i++) {
        obj[keys[i]] = registerTokenCache.get(keys[i])
      }
      
      sendSuccess(res, obj, keys.length)

    } else {
      sendFailureNotPermitted(res)
    }
  })
}