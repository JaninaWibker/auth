const db = require('../db.js')

const sendNotAuthorized = (res) => res.status(403).json({
  message: 'account not permitted',
  status: 'failure'
})

const sendFailure = (res) => res.status(500).json({
  message: 'account deletion failed',
  status: 'failure'
})

const sendSuccess = (res) => res.status(200).json({
  message: 'account deletion successful',
  status: 'success'
})


module.exports = (req, res) => {
  
  let userIdToBeDeleted

  if(req.body.id !== undefined) {
    if(req.user.account_type === 'admin') {
      userIdToBeDeleted = req.body.id
    } else {
      return sendNotAuthorized(res)
    }
  } else {
    userIdToBeDeleted = req.user.id
  }

  db.deleteUser(userIdToBeDeleted, (err, rows_affected) => {
    if(err) sendFailure(res)
    else    sendSuccess(res)
  })

}