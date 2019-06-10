module.exports = {
  test: require('./test.js'),
  list: require('./list.js'),
  info: require('./info.js'),
  add:  require('./add.js'),
  adminAdd: require('./admin-add.js'),
  delete:  require('./delete.js'),
  modify:  require('./modify.js'),
  modifySelf:  require('./modifySelf.js'),
  login: require('./login.js'),
  logout: require('./logout.js'),
  username_already_taken: require('./username_already_taken.js'),
  is_passwordless: require('./is_passwordless.js'),
  set_password: require('./set_password.js'),
  verify_password_validity: require('./verify_password_validity.js')
}