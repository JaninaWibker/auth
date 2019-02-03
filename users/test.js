module.exports = (req, res) => {
  res.json({ message: 'authenticated', status: 'successful', user: req.user })
}