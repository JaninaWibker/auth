const db = require('../db.js')

module.exports = (Logout) => (req, res) => {
  if(req.body.id || req.user.id) {

    db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
      if(err) return res.status(500).json(info)
      if(user.account_type === 'admin') db.privilegedModifyUser(req.body.id || req.user.id, req.body, (err, x) => {
          if(err) res.json({ message: 'privileged account modification failed', status: 'failure' })
          else Logout(req.body.id || req.user.id, bool => res.json({ message: 'privileged account modification ' + (bool ? 'successful' : 'failed'), status: bool ? 'success' : 'failure' }))
        })
      else db.modifyUser(req.user.id, req.body, (err, x) => {
          if(err) res.json({ message: 'account modification failed', status: 'failure' })
          else Logout(req.user.id, bool => res.json({ message: 'account modification ' + (bool ? 'successful' : 'failed'), status: bool ? 'success' : 'failure' }))
        })
    })

  } else {
    res.json({ message: 'supply id' })
  }
}
