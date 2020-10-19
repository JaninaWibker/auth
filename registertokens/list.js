const sendFailureNotPermitted = (res) => res.status(403).json({
  message: 'account not permitted', status: 'failure'
})

const sendSuccess = (res, register_tokens, count) => res.status(200).json({
  register_tokens: register_tokens,
  count: count,
  message: 'retrieving register token list successful',
  status: 'success'
})

module.exports = (registerTokenCache) => (validateRegisterToken) => (req, res) => {
  if(req.user.account_type === 'admin') {
    const keys = registerTokenCache.keys()
    const tokens = {}

    for(let i = 0; i < keys.length; i++) {
      if(req.params.extra === 'decrypt') {
        const register_token = registerTokenCache.get(keys[i])
        const metadata = validateRegisterToken(register_token)
        metadata.formatted_timestamp = global.format_date(new Date(metadata.timestamp))
        tokens[keys[i]] = {
          register_token: register_token,
          metadata: metadata,
        }
      } else {
        tokens[keys[i]] = registerTokenCache.get(keys[i])
      }
      
    }
    
    sendSuccess(res, tokens, keys.length)

  } else {
    sendFailureNotPermitted(res)
  }
}