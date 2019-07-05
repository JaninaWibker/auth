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

const sendSuccess = (res, users) => res.status(200).json({
  users: users,
  count: users.length,
  status: 'success'
})

const listUsers = (req, res) => {

  if(req.user.account_type === 'admin') {
    db.getUserList((err, users, info ) => {
      if(err || info) sendFailure(res, info.message)
      else            sendSuccess(res, users)
    })
  } else {
    sendFailureNotPermitted(res)
  }
  
}

module.exports = listUsers