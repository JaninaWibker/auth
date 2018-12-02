module.exports = (validateRegisterToken) => (req, res) => {
  res.json(validateRegisterToken(req.body.register_token))
}