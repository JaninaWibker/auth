module.exports = (Logout) => (req, res) => {
  Logout(req.user.id, bool => res.json({ message: bool ? 'log out successful' : 'log out failed' }))
}