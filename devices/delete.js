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

const sendSuccess = (res, message, status) => res.status(200).json({
  message: message,
  status: 'success',
  is_deleted: status
})

/*
  {
    device_id, -- required for everyone
    user_id -- only usably by admins, defaults to req.user.id
  }
*/

const deleteDevice = (req, res) => {

    const device_id = req.body.device_id
    const user_id = req.body.user_id

    if(device_id) {

      if(user_id && req.user.account_type === 'admin') {
        db.Device.delete(user_id, device_id, (err, status) => {
          if(err) console.log(err.stack)
          if(err) sendError(res, 'failed to delete device ' + device_id, err)
          else    sendSuccess(res, 'successfully deleted device ' + device_id, status)
        })
      } else if(user_id && user_id !== req.user.id && req.user.account_type !== 'admin') {
        sendFailureNotPermitted(res)
      } else {
        db.Device.delete(req.user.id, device_id, (err, status) => {
          if(err) sendError(res, 'failed to delete device ' + device_id, err)
          else    sendSuccess(res, 'successfully deleted device ' + device_id, status)
        })
      }
    } else {
      sendFailure(res, 'supply device id')
    }
  }

module.exports = deleteDevice