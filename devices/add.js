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
  device: device,
  status: 'success'
})

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
      if(!req.body.ip || !req.body.useragent) {
                    sendFailure(res, 'supply ip and useragent')
      } else {
        db.Device.add({ ip: req.body.ip, useragent: req.body.useragent }, (err, device) => {
          if(err)   sendError(res, 'failed to add new device', err)
          else      sendSuccess(res, 'successfully added new device', device)
        })
      }
    } else {
                    sendFailureNotPermitted(res)
    }
  })

module.exports = addDevice