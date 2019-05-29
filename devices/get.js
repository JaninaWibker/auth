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

const sendSuccess = (res, message, device) => res.status(200).json({
  message: message,
  device: device,
  status: 'success'
})

const getDevice = (req, res) =>
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return sendError(res, 'could not validate requesting users account type', info)

    if(req.body.device && req.body.account_type === 'admin') {
      db.Device.getWithoutUserId(req.body.device, (err, device, info) => {
        if(err || info) sendError(res, 'error while getting device information', info.message)
        sendSuccess(res, 'successfully retrieved device information (admin)', device)
      })
    } else if(req.body.device && req.body.account_type !== 'admin') {
      db.Device.get(req.user.id, req.body.device_id, (err, device, info) => {
        if(err || info) sendError(res, 'error while getting device information', info.message)
        if(device) {
          sendSuccess(res, 'successfully retrieved device information', device)
        } else {
          sendFailureNotPermitted(res)
        }
      })
    } else {
      sendFailure(res, 'supply device id (body.device) to retrieve device information')
    }
  })

  module.exports = getDevice