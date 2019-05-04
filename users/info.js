const db = require('../db.js')

const sendFailure = (res) => res.status(500).json({
  message: 'retrieving user data failed',
  status: 'failure'
})

const sendSuccess = (res, user) => res.status(200).json({
  message: 'retrieved user data successfully',
  status: 'success',
  user: user
})

module.exports = (req, res) => {
  console.log(req.body, req.user)
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(req.body.username === undefined) {
      db.getUserIfExists(req.user.username, (err, user) => {
        if(err) sendFailure(res)
        else    sendSuccess(res, user)
      })
    }
    else if(req.body.username === req.user.username || user.account_type === 'admin') {
      db.getUserIfExists(req.body.username, (err, user) => {
        if(err) sendFailure(res)
        else    sendSuccess(res, user)
      })
    } else {
      db.getUserLimitedIfExists(req.body.username, (err, user) => {
        if(err) sendFailure(res)
        else    sendSuccess(res, user)
      })
    }
  })
}