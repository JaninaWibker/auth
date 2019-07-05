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
  is_revoked: status,
})

/*
  {
    user_id, -- usable by admins, defaults to req.user.id
    device_id -- usable by everyone
  }
*/

const revokeDevice = (req, res) => {
  if(req.body.user_id && req.user.account_type === 'admin') {
    db.Device.revoke(req.body.user_id, req.body.device_id, true, (err, status) => {
      if(err || !status)  sendError(res, 'failed to revoke device ' + req.body.device_id + ' from user ' + req.body.user_id, err)
      else                sendSuccess(res, 'successfully revoked device', status)
    })
  } else if(req.body.user_id && req.user.account_type !== 'admin') {
                          sendFailureNotPermitted(res)
  } else {
    db.Device.revoke(req.user.id, req.body.device_id, true, (err, status) => {
      if(err || !status)  sendError(res, 'failed to revoke device ' + req.body.device_id + ' from user ' + req.user.id, err)
      else                sendSuccess(res, 'successfully revoked device', status)
    })
  }
}

module.exports = revokeDevice