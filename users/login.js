module.exports = (Login) => (req, res) => {
  console.log('[login] ', { password: req.body.password, username: req.body.username })
  if(req.body.username && req.body.password) {
    const username = req.body.username
    const password = req.body.password
    Login(username, password, (err, token) => {
      console.log(err, token)
      if(err || !token) res.status(401).json({ message: 'authentication failed' })
      else res.json({ message: 'authentication successful', token: token })
    })
  } else {
    res.status(401).json({ message: 'supply username and password' })
  }
}