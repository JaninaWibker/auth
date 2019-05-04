const db = require('../db.js')

const sendSuccess = (res) => res.status(200).json({
  message: 'account deletion successful',
  status: 'success'
})

const sendFailure = (res) => res.status(500).json({
  message: 'account deletion failed',
  status: 'failure'
})

module.exports = (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return res.status(500).json(info)

    const userIdToBeDeleted = user.account_type ==='admin' && req.body.id !== undefined ? req.body.id : req.user.id 

    db.deleteUser(userIdToBeDeleted, (err, rows_affected) => {
      if(err) sendFailure(res)
      else    sendSuccess(res)
    })

  })
}