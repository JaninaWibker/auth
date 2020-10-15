const db = require('../db.js')
const parse_ua = require('../utils/simplify-user-agent.js')

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

const getDevice = (req, res) => {

    const device_id = req.params.device_id
    const user_id = req.params.user_id

    if(!device_id) {
      sendError(res, 'supply device id to retrieve device information')
    } else if(user_id && req.user.account_type === 'admin') {
      device.parsed_user_agent = parse_ua(device.user_agent)
      db.Device.get(parseInt(user_id, 10), device_id, (err, device, info) => {
        if(err || info) sendError(res, 'error while getting device information', info)
        else if(device) sendSuccess(res, 'successfully retrieved device information', device)
        else            sendFailure(res, 'error while getting device information')
      })
    } else if(user_id && user_id !== req.user.id && req.user.account_type !== 'admin') {
                        sendFailureNotPermitted(res)
    } else {
      db.Device.get(req.user.id, device_id, (err, device, info) => {
        if(err || info) sendError(res, 'error while getting device information', info)
        else if(device) sendSuccess(res, 'successfully retrieved device information', device)
        else            sendFailure(res, 'error while getting device information')
      })
    }
  }

  module.exports = getDevice