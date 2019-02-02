module.exports = (Login) => (req, res) => {
  const isRefreshToken = req.body.isRefreshToken || req.body.password.startsWith('Refresh-Token:')
  const getRefreshToken = req.body.getRefreshToken || req.body.password.startsWith('Get-Refresh-Token:')
  let passwordOrRefreshToken
  if(isRefreshToken) {
    passwordOrRefreshToken = req.body.password.startsWith('Refresh-Token:')
    ? req.body.password.substring('Refresh-Token:'.length)
    : req.body.password
  } else if(getRefreshToken) {
    passwordOrRefreshToken = req.body.password.startsWith('Get-Refresh-Token:')
    ? req.body.password.substring('Get-Refresh-Token:'.length)
    : req.body.password
  } else {
    passwordOrRefreshToken = req.body.password
  }

  console.log('[login] ', isRefreshToken
    ? ({ refreshToken: req.body.password.substring(0, 96), username: req.body.username })
    : ({ password: req.body.password, username: req.body.username })
  )

  if(req.body.username && passwordOrRefreshToken) {
    Login(req.body.username, passwordOrRefreshToken, isRefreshToken, getRefreshToken, (err, accessToken, refreshToken) => {
      console.log(err, accessToken)
      if(err || !accessToken) res.status(401).json({ message: 'authentication failed' })
      else res.json({ message: 'authentication successful', status: 'success', token: accessToken, refreshToken: refreshToken })
    })
  } else {
    res.status(401).json({ message: 'supply username and password', status: 'failure' })
  }
}