const iplookup = require('./iplookup.js')
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

const sendSuccess = (res, message, device_id) => res.status(200).json({
  message: message,
  status: 'success',
  device_id: device_id
})

const addDeviceIntermediate = ({ ip, user_agent, user_id }, cb) => {
  iplookup.getFromDatabaseOrFromServiceAndThenSaveToDatabase(ip, (err, data, message) => {
    if(err) cb(err, null, message)
    else if(user_id !== undefined) db.Device.add({ ip, user_agent }, user_id, (err, device_id) => {
      if(err) cb(err, null, 'failed to add new device to user ' + user_id)
      else    cb(null, device_id, 'successfully added new device to user ' + user_id)
    })
    else if(user_id === undefined) db.Device.addWithoutUserId({ ip, user_agent }, (err, device_id) => {
      if(err) cb(err, null, 'failed to add new device')
      else    cb(null, device_id, 'successfully added new device')
    })
  })
}

/*
{
  ip,
  user-agent
}
*/

const addDevice = (req, res) => 
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return  sendError(res, 'could not validate requesting users account type', info)
    if(user.account_type === 'admin') {
      if(!req.body.ip || !req.body.user_agent) {
                    sendFailure(res, 'supply ip and useragent')
      } else {
        addDeviceIntermediate({ ip: req.body.ip, user_agent: req.body.user_agent, user_id: req.body.user_id }, (err, device_id, message) => {
          if(err)   sendError(res, message, err)
          else      sendSuccess(res, message, device_id)
        })
      }
    } else {
                    sendFailureNotPermitted(res)
    }
  })

module.exports = {
  addDevice,
  addDeviceIntermediate
}