const isProduction = require('dotenv').config().parsed['ENVIRONMENT'] === 'PROD'
const { event, bug } = require('../analytics.js')
const format_date = (date=new Date()) =>
  date.toLocaleDateString().replace(/\//g, '-') + '@' + date.toLocaleTimeString()

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

  if(!isProduction) console.log('[login] ', isRefreshToken
    ? ({ refreshToken: req.body.password.substring(0, 96), username: req.body.username })
    : ({ password: req.body.password, username: req.body.username })
  )

  if(req.body.username && passwordOrRefreshToken) {
    Login(req.body.username, passwordOrRefreshToken, isRefreshToken, getRefreshToken, (err, accessToken, refreshToken) => {

      if(!isProduction) console.log(err, accessToken)

      if(err) bug({ category: 'LOGIN_ERROR', error: err, metadata: {
        username: req.body.username,
        refreshToken: isRefreshToken ? passwordOrRefreshToken : null,
        isRefreshToken: isRefreshToken,
        getRefreshToken: getRefreshToken
      } })
      else event({ category: 'LOGIN', title: `${req.body.username} logged in at ${format_date()} (${Date.now()})`, data: {
        username: req.body.username,
        refreshToken: isRefreshToken ? passwordOrRefreshToken : null,
        isRefreshToken: isRefreshToken,
        getRefreshToken: getRefreshToken,
        accessToken: accessToken
      } })

      if(err || !accessToken) res.status(401).json({ message: 'authentication failed', status: 'failure' })
      else res.json({ message: 'authentication successful', status: 'success', token: accessToken, refreshToken: refreshToken })
    })
  } else {
    res.status(401).json({ message: 'supply username and password', status: 'failure' })
  }
}