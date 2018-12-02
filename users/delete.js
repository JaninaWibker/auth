const db = require('../db.js')

module.exports = (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return res.status(500).json(info)

    const userIdToBeDeleted = user.account_type ==='admin' && req.body.id !== undefined ? req.body.id : req.user.id 

    db.deleteUser(userIdToBeDeleted, (err, rows_affected) => {
      if(err) res.json({ message: 'account deletion failed' })
      else res.json({ message: 'account deletion successful' })
    })

  })
}