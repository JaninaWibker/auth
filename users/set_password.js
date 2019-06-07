const db = require('../db.js')

const sendFailureNotPermitted = (res) => res.status(403).json({
  message: 'account not permitted', status: 'failure'
})

const sendError = (res, message, err) => res.status(500).json({
  message: message,
  status: 'failure',
  error: err
})

const sendSuccess = (res, message) => res.status(200).json({
  message: message,
  status: 'success'
})

module.exports = (req, res) => {
  const username = req.body.username
  const password = req.body.password

  db.User.get.byUsername(username, (err, user, info) => {
    if(err)     sendError(res, 'failed to set password for user ' + username, err)
    if(user.is_passwordless) {
      db.User.privilegedModify(user.id, { password: password, passwordless: false }, (err, _rtn) => {
        if(err) sendError(res, 'failed to set password for user ' + username, err)
        else    sendSuccess(res, 'successfully set password for user ' + username)
      })
    } else {
                sendFailureNotPermitted(res)
    }
  })
}