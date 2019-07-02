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

      const device_id = req.body.device_id
      const ip = req.body.ip
      const user_agent = req.body.user_agent

      modifyDeviceIntermediate(device_id, { ip: ip, user_agent: user_agent }, (err, device) => { // TODO: fix this; this assumes that modifyDeviceIntermediate does NOT need a user_id
        if(err) sendError(res, 'failed to modify device ' + device_id, err)
        else    sendSuccess(res, 'successfully modified device ' + device_id, device)
      })
    } else {
      sendFailureNotPermitted(res)
    }
  })

module.exports = {
  modifyDevice,
  modifyDeviceIntermediate
}