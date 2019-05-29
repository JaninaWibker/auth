const db = require('../db.js')

const sendNotAuthorized = (res) => res.status(401).json({
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
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return res.status(500).json(info)

    let userIdToBeDeleted

    if(req.body.id !== undefined) {
      if(user.account_type === 'admin') {
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

  })
}