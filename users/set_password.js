const db = require('../db.js')

const sendFailureNotPermitted = (res) => res.status(403).json({
  message: 'account not permitted', status: 'failure'
})

const sendError = (res, message, err) => res.status(500).json({
  message: message,
  status: 'failure',
  error: err
})

const sendSuccess = (res, message, device_id) => res.status(200).json({
  message: message,
  status: 'success',
  device_id: device_id
})

const privilegedModify = (res, user_id, username, password, device_id) => db.User.privilegedModify(user_id, { password: password, passwordless: false }, (err, _rtn) => {
  if(err) sendError(res, 'failed to set password for user ' + username, err)
  else    sendSuccess(res, 'successfully set password for user ' + username, device_id)
})

module.exports = (req, res) => {
  const username = req.body.username
  const password = req.body.password
  const device_id = req.body.device_id || req.get('Device-Id')

  db.User.get.byUsername(username, (err, user, _info) => {
    if(err)     sendError(res, 'failed to set password for user ' + username, err)
    if(user.is_passwordless) {

      if(device_id) {
        db.Device.getWithoutUserId(device_id, (err, device) => {
          if(err) sendError(res, 'failed to get device associated with sent device id (' + device_id + ')', err)

          else if(!device) sendError(res, 'failed to get device associated with sent device id (' + device_id + ')', err)

          else db.Device.get(user.id, device_id, (err, device) => {
            if(err) sendError(res, 'failed to get device associated with sent device id (' + device_id + ')', err)

            else if(!device) db.Device.addExistingToUser({ user_id: user.id, device_id: device_id }, (err, _rtn) => {
                if(err) sendError(res, 'failed to add existing device (' + device_id + ') to user ' + username, err)
                else    privilegedModify(res, user.id, username, password, device_id)
              }) 

            else db.Device.modifyLastUsed(device_id, user_id, last_used, (err, _rtn) => {
                if(err) sendError(res, 'failed to update last used information on device ' + device_id, err)
                else    privilegedModify(res, user.id, username, password, device_id)
              })
          })
        })
      } else {
        db.add({ ip: req.ip, user_agent: req.get('User-Agent') }, user.id, (err, device_id) => {
          if(err) sendError(res, 'failed to add new device (' + device_id + ') to user ' + username , err)
          else privilegedModify(res, user.id, username, password, device_id)
        })
      }

    } else {
                sendFailureNotPermitted(res)
    }
  })
}