module.exports = (req, res) => {
  res.json({ message: 'authenticated', user: req.user })
}