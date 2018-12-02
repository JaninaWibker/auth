const db = require('../db.js')

module.exports = (Logout) => (req, res) => {
  if(req.body.id || req.body.username) {

    const cb = (err, user, info) => {
      if(err) return res.status(500).json(info)
      if(user.account_type === 'admin') db.privilegedModifyUser(req.body.id, req.body, (err, x) => {
          if(err) res.status(500).json({ message: 'account modification failed' })
          else Logout(req.body.id, bool => res.json({ message: 'account modification ' + (bool ? 'successful' : 'failed') }))
        })
      else db.modifyUser(req.body.id, req.body, (err, x) => {
          if(err) res.status(500).json({ message: 'account modification failed' })
          else Logout(req.body.id, bool => res.json({ message: 'account modification ' + (bool ? 'successful' : 'failed') }))
        })
    }

    if(req.body.id) db.getUserFromIdIfExists(req.body.id, cb)
    else if(req.body.username) db.getUserIfExists(req.body.username, cb)
  } else {
    res.status(500).json({ message: 'supply username or id' })
  }
}