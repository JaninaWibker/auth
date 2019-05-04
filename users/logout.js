const sendSuccess = (res) => res.status(200).json({
  message: 'log out successful',
  status: 'success'
})

const sendFailure = (res) => res.status(500).json({
  message: 'log out failed',
  status: 'failure'
})

module.exports = (Logout) => (req, res) => {
  Logout(req.user.id, bool => bool
    ? sendSuccess(res) 
    : sendFailure(res)
  )
}