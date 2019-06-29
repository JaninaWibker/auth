const db = require('../db.js')
const iplookup = require('./iplookup.js')

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
  status: 'success',
  device: device
})

const modifyDeviceIntermediate = (user_id, device_id, { ip, user_agent }, cb) => {
  return db.allInOneDeviceModify(user_id, device_id, { ip, user_agent }, iplookup.request, iplookup.saveToDatabase, cb)
}

/*
  {
    device_id,
    ip,
    user-agent
  }
*/

const modifyDevice = (req, res) =>
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return sendError(res, 'could not validate requesting users account type', info)
    if(user.account_type === 'admin') {
      modifyDeviceIntermediate(req.body.device_id, { ip: req.body.ip, user_agent: req.body.user_agent }, (err, device) => {
        if(err) sendError(res, 'failed to modify device ' + req.body.device_id, err)
        else    sendSuccess(res, 'successfully modified device ' + req.body.device_id, device)
      })
    } else {
      sendFailureNotPermitted(res)
    }
  })

module.exports = {
  modifyDevice,
  modifyDeviceIntermediate
}