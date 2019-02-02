const db = require('../db.js')

module.exports = (req, res) => {
  console.log(req.body, req.user)
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(req.body.username === undefined) {
      db.getUserIfExists(req.user.username, (err, user) => {
        if(err) res.status(500).json({ message: 'retrieving user data failed', status: 'failure' })
        else    res.json({ message: 'retrieved user data successfully', user: user })
      })
    }
    else if(req.body.username === req.user.username || user.account_type === 'admin') {
      db.getUserIfExists(req.body.username, (err, user) => {
        if(err) res.status(500).json({ message: 'retrieving user data failed', status: 'failure' })
        else    res.json({ message: 'retrieved user data successfully', status: 'success', user: user })
      })
    } else {
      db.getUserLimitedIfExists(req.body.username, (err, user) => {
        if(err) res.status(500).json({ message: 'retrieving user data failed', status: 'failure' })
        else    res.json({ message: 'retrieved user data successfully', status: 'success', user: user })
      })
    }
  })
}