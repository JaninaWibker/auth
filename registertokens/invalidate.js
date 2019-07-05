const sendFailureNotPermitted = (res) => res.status(403).json({
  message: 'account not permitted',
  status: 'failure'
})

const sendFailure = (res, message) => res.status(500).json({
  message: message,
  status: 'failure'
})

const sendSuccess = (res, message) => res.status(200).json({
  message: message,
  status: 'success'
})

module.exports = (registerTokenCache) => (validateRegisterToken) => (req, res) => {
  if(req.user.account_type === 'admin') {
    if(req.body.id || req.body.register_token) {
      if(req.body.id) {
        registerTokenCache.del(req.body.id)
        sendSuccess(res, 'register token invalidated successfully')
      } else {
        registerTokenCache.del(validateRegisterToken(req.body.register_token).id)
        sendSuccess(res, 'register token invalidated successfully')
      }
    } else {
      sendFailure(res, 'supply register token id or token')
    }
  } else {
    sendFailureNotPermitted(res)
  }
}