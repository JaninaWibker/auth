const db = require('../db.js')

module.exports = (req, res) => {
  const username = req.body.username

  db.User.get.byUsername(username, (err, user, info) => {
    res.json({
      is_taken: !(err || !user || info.message === 'user not found')
    })
  })
}