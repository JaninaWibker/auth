const db = require('../db.js')

module.exports = (req, res) => {
  console.log(req.body, req.user)
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(req.body.username === undefined) {
      db.getUserIfExists(req.user.username, (err, user) => {
        res.json({ message: '', user: user })
      })
    }
    else if(req.body.username === req.user.username || user.account_type === 'admin') {
      db.getUserIfExists(req.body.username, (err, user) => {
        res.json({ message: '', user: user })
      })
    } else {
      db.getUserLimitedIfExists(req.body.username, (err, user) => {
        res.json({ message: '', user: user })
      })
    }
  })
}