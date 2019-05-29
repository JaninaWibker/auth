const db = require('../db.js')

const sendFailureNotPermitted = (res) => res.status(403).json({
  message: 'account not permitted', status: 'failure'
})

const sendError = (res, message, err) => res.status(500).json({
  message: message,
  status: 'failure',
  error: err
})

const sendFailure = (res, message) => res.status(500).json({
  message: message,
  status: 'failure'
})

const sendSuccess = (res, message, devices) => res.status(200).json({
  message: message,
  devices: devices,
  count: devices.length,
  status: 'success'
})

const listDevices = (req, res) =>
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return sendError(res, 'could not validate requesting users account type', info)
    if(req.body.id && req.body.account_type === 'admin') {
      db.Device.list(req.body.id, (err, devices, info) => {
        if(err || info) sendFailure(res, info.message)
        else            sendSuccess(res, 'sucecssfully retrieved list of devices for user ' + req.body.id, devices)
      })
    } else if(req.body.id && req.body.account_type !== 'admin') {
      sendFailureNotPermitted(res)
    } else {
      db.Device.list(req.user.id, (err, devices, info) => {
        if(err || info) sendFailure(res, info.message)
        else            sendSuccess(res, 'sucecssfully retrieved list of devices for user ' + req.user.id, devices)
      })
    }
  })

  module.exports = listDevices