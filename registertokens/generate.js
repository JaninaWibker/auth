let registerTokenCacheIndex = 0

const sendFailureNotPermitted = (res) => res.status(403).json({
  message: 'account not permitted',
  status: 'failure'
})

const sendData = (res, message, data) => res.status(200).json({
  message: message,
  status: 'success',
  ...data
})

module.exports = (registerTokenCache) => (generateRegisterToken) => (req, res) => {
  if(req.user.account_type === 'admin') {
    const permanent = req.body.permanent !== undefined ? req.body.permanent : false
    const register_token = generateRegisterToken({
      id: registerTokenCacheIndex,
      timestamp: Date.now(),
      ...req.body, // this adds to additional information to the register token which is used when adding an account using a register token. 
      permanent: permanent,
      expireAt: permanent ? 0 : (req.body.expireAt || 30 * 60 * 1000),
    })

    registerTokenCache.put(registerTokenCacheIndex, register_token)

    sendData(res, 'successfully generated new Register-Token', { register_token: register_token, id: registerTokenCacheIndex++ })

  } else {
    sendFailureNotPermitted(res)
  }
}

// should register tokens be saved to a database? probably yes.