const db = require('../db.js')

module.exports = (req, res) => {
  db.authenticateUserIfExists(req.user.username, req.body.password, null, (err, user, info) => {
    if(err || info || !user) res.json({ state: 'invalid' })
    else res.json({ state: 'valid' })
  })
}