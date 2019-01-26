module.exports = (_) => (validateRegisterToken) => (req, res) => {
  res.json(validateRegisterToken(req.body.register_token))
}