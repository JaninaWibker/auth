const isProduction = require('dotenv').config().parsed['ENVIRONMENT'] === 'PROD'
const { event, bug } = require('../analytics.js')

const db = require('../db.js')
const { addDeviceIntermediate } = require('../devices/add.js')
const { modifyDeviceIntermediate } = require('../devices/modify.js')

const modifyLastUsed = (device_id, user_id, last_used, reject, resolve) => db.Device.modifyLastUsed(device_id, user_id, last_used, (err, _rtn) => {
  if(err) reject(err)
  else    resolve(device_id)
})

const addDevice = ({ ip, user_agent, user_id }, reject, resolve) => addDeviceIntermediate({ ip, user_agent, user_id}, (err, device_id) => {
  if(err) reject(err)
  else resolve(device_id)
})

module.exports = (Login) => (req, res) => {
  if(req.body.password === null) {
    return res.status(401).json({ message: 'authentication failed, supply username, password and/or refresh-token', status: 'failure' })
  }
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

    const devicePromise = new Promise((resolve, reject) => {

      db.User.get.byUsername(req.body.username, (err, user) => {
        if(err) reject(err)
        else {
          const device_id = req.body.device_id || req.get('Device-Id')

          if(device_id) {
            modifyDeviceIntermediate(device_id, { ip: req.ip, user_agent: req.get('User-Agent') }, (err, _rtn, _message) => {
              if(err) { // used a device_id that does not exist, when this happens just add a new device and return the device_id of the new device
                // can the ip lookup be defered?
                addDevice({ ip: req.ip, user_agent: req.get('User-Agent'), user_id: user.id }, reject, resolve)
              } else {
                db.Device.get(user.id, device_id, (err, device) => {
                  if(err) reject(err)
                  else if(!device) db.Device.addExistingToUser({ user_id: user.id, device_id: device_id }, (err, _rtn) => {
                      if(err) reject(err)
                      else    resolve()
                    })
                  else if(device.is_revoked && isRefreshToken) reject({ message: 'authorization failed, device revoked', status: 'failure' })
                  else if(device.is_revoked && !isRefreshToken) db.Device.revoke(user.id, device_id, false, (err, _rtn) => {
                    if(err) reject(err)
                    modifyLastUsed(device_id, user.id, new Date(), reject, resolve)
                  })
                  else modifyLastUsed(device_id, user.id, new Date(), reject, resolve)
                })
              }
            })
          } else {
            // this can be optimized into a single sql statement (at least the modifyLastUsed thing)
            // can addDevice be deferred? Just generate a uuidv4 and do the ip lookup later.
            db.Device.getByUserIdAndIpAndUserAgent(user.id, req.ip, req.get('User-Agent'), (err, device) => {
              if(err)           reject(err)
              else if(!device)  addDevice({ ip: req.ip, user_agent: req.get('User-Agent'), user_id: user.id }, reject, resolve)
              else              modifyLastUsed(device.device_id, user.id, new Date(), reject, resolve)
            })
          }
        }
      })

    })

    // const devicePromise = Promise.resolve('just-testing')

    devicePromise
      .then(device_id => {
        Login(req.body.username, passwordOrRefreshToken, isRefreshToken, getRefreshToken, (err, accessToken, refreshToken) => {
          if(!isProduction) console.log(err, accessToken)

          if(isProduction) {
            if(err) bug({ category: 'LOGIN_ERROR', error: err, metadata: {
              username: req.body.username,
              refreshToken: isRefreshToken ? passwordOrRefreshToken : null,
              isRefreshToken: isRefreshToken,
              getRefreshToken: getRefreshToken,
              clientId: req.cookies.clientId
            } })
            else event({ category: 'LOGIN', title: `${req.body.username} logged in at ${format_date()} (${Date.now()})`, data: {
              username: req.body.username,
              refreshToken: isRefreshToken ? passwordOrRefreshToken : null,
              isRefreshToken: isRefreshToken,
              getRefreshToken: getRefreshToken,
              accessToken: accessToken,
              clientId: req.cookies.clientId,
              ip: req.ip,
              useragent: req.get('User-Agent'),
              https: req.secure,
              method: req.method,
            } })
          }

          if(err || !accessToken) res.status(401).json({ message: 'authentication failed', status: 'failure', device_id: device_id })
          else res.json({ message: 'authentication successful', status: 'success', token: accessToken, refreshToken: refreshToken, device_id: device_id })

        })
      })
      .catch(err => {
        if(err.status === 'failure') res.status(401).json({ message: err.message, status: 'failure' })
        else                         res.status(401).json({ message: 'authentication failed', status: 'failure', err: err })
      })

  } else {
    res.status(401).json({ message: 'supply username and password', status: 'failure' })
  }
}