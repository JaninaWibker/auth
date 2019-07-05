const db = require('../db.js')

const sendFailure = (res, message) => res.status(500).json({
  message: message,
  status: 'failure'
})

const sendSuccess = (res, message) => res.status(200).json({
  message: message,
  status: 'success'
})

module.exports = (Logout) => (req, res) => {

  if(req.user.account_type === 'admin') db.privilegedModifyUser(req.user.id, req.body, (err, _res) => {
    if(err) sendFailure(res, 'privileged account modification failed')
    else Logout(req.user.id, bool => bool
      ? sendSuccess(res, 'privileged account modification successful')
      : sendFailure(res, 'privileged account modification failed')
    )
  })
  else db.modifyUser(req.user.id, req.body, (err, _res) => {
    if(err) sendFailure(res, 'account modification failed')
    else Logout(req.user.id, bool => bool
      ? sendSuccess(res, 'account modification successful')
      : sendFailure(res, 'account modification failed')
    )
  })
}