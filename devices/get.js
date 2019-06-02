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

/*
params {
  :device_id, -- usably by everybody
  :user_id -- usable by admins only, defaults to req.user.id
}
*/

const getDevice = (req, res) =>
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err)      return sendError(res, 'could not validate requesting users account type', info)

    if(!req.params.device_id) {
      sendError(res, 'supply device id to retrieve device information')
    } else if(req.params.user_id && user.account_type === 'admin') {
      db.Device.get(parseInt(req.params.user_id, 10), req.params.device_id, (err, device, info) => {
        if(err || info) sendError(res, 'error while getting device information', info)
        else if(device) sendSuccess(res, 'successfully retrieved device information', device)
        else            sendFailure(res, 'error while getting device information')
      })
    } else if(!req.params.user_id) {
      db.Device.get(req.user.id, req.params.device_id, (err, device, info) => {
        if(err || info) sendError(res, 'error while getting device information', info)
        else if(device) sendSuccess(res, 'successfully retrieved device information', device)
        else            sendFailure(res, 'error while getting device information')
      })
    }
  })

  module.exports = getDevice