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

const revokeDevice = (req, res) =>
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return sendError(res, 'could not validate requesting users account type', info)
    if(req.body.user_id && user.account_type === 'admin') {
      db.Device.revoke(req.body.user_id, req.body.device_id, true, (err, status) => {
        if(err || !status)  sendError(res, 'failed to revoke device ' + req.body.device_id + ' from user ' + req.body.user_id, err)
        else                sendSuccess(res, 'successfully revoked device', status)
      })
    } else if(req.body.user_id && user.account_type !== 'admin') {
                            sendFailureNotPermitted(res)
    } else {
      db.Device.revoke(user.id, req.body.device_id, true, (err, status) => {
        if(err || !status)  sendError(res, 'failed to revoke device ' + req.body.device_id + ' from user ' + user.id, err)
        else                sendSuccess(res, 'successfully revoked device', status)
      })
    }
  })

module.exports = revokeDevice