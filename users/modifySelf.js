const db = require('../db.js')

module.exports = (Logout) => (req, res) => {
  if(req.user.id) {

    console.log('[MODIFYSELF]', req.body)

    db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
      if(err) return res.status(500).json(info)
      if(user.account_type === 'admin') db.privilegedModifyUser(req.user.id, req.body, (err, x) => {
          if(err) res.status(500).json({ message: 'privileged account modification failed', status: 'failure' })
          else Logout(req.user.id, bool => res.json({ message: 'privileged account modification ' + (bool ? 'successful' : 'failed'), status: bool ? 'success' : 'failure' }))
        })
      else db.modifyUser(req.user.id, req.body, (err, x) => {
          if(err) res.status(500).json({ message: 'account modification failed', status: 'failure' })
          else Logout(req.user.id, bool => res.json({ message: 'account modification ' + (bool ? 'successful' : 'failed'), status: bool ? 'success' : 'failure' }))
        })
    })

  } else {
    res.json({ message: 'supply id', status: 'failure' })
  }
}


// removed req.body.id || from 3 places, why was this even here? I thought modifySelf existed specifically to not be able to modify others