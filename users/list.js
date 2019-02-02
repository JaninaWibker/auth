const db = require('../db.js')

const listUsers = (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return res.status(500).json(info)
    if(user.account_type === 'admin') {
      db.getUserList((err, users, info) => {
        if(err || info) res.status(500).json({ message: info.message, status: 'failure' })
        else res.json({ users: users, status: 'success' })
      })
    } else {
      res.status(403).json({ message: 'account not permitted', status: 'failure' })
    }
  })
}

module.exports = listUsers