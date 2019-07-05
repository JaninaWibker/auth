module.exports = (req, res) => {
  res.json({ message: 'authenticated', status: 'success', user: req.user })
}