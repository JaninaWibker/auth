const db = require('../db.js')

const sendFailureMoreArgumentsNeeded = (res) => res.status(500).json({
  message: 'supply username or id', status: 'failure'
})

const sendSuccess = (res) => res.status(200).json({
  message: 'account modification successful', status: 'success'
})

const sendFailure = (res, err) => res.status(500).json({
  message: 'account modification failed',
  status: 'failure',
  error: err
})

module.exports = (Logout) => (req, res) => {

  if(req.body.id || req.body.username) {

    const actingUser = req.user // this is the user making the request
    const proposedChanges = req.body // these are the changes the user wants to make to (req.body.id || req.body.username)
    delete proposedChanges.id // the id cannot be changed, therefore it is removed here

    const cb = (err, userToBeModified, info) => {
      if(err) return res.status(500).json(info)
      if(actingUser.account_type === 'admin') db.privilegedModifyUser(userToBeModified.id, proposedChanges, (err, x) => {
          if(err) sendFailure(res, err)
          else Logout(userToBeModified.id, userWasLoggedOut => userWasLoggedOut
              ? sendSuccess(res)
              : sendFailure(res, 'something went wrong while logging out ' + userToBeModified.username + '. It could be that the modifications were still made even though this error appears')
            )
        })
      else db.modifyUser(userToBeModified.id, proposedChanges, (err, x) => {
          if(err) sendFailure(res, err)
          else Logout(userToBeModified.id, bool => bool
              ? sendSuccess(res)
              : sendFailure(res, 'something went wrong while logging out ' + userToBeModified.username + '. It could be that the modifications were still made even though this error appears')
            )
        })
    }

    if(req.body.id) db.getUserFromIdIfExists(req.body.id, cb)
    else if(req.body.username) db.getUserIfExists(req.body.username, cb)

  } else { 
    sendFailureMoreArgumentsNeeded(res)
  }
}
