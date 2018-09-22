const crypto = require('crypto')
const sqlite = require('sqlite')
const speakeasy = require('speakeasy')

const dbPromise = sqlite.open('./Users.sqlite')

const gen_salt = () => crypto.randomBytes(48).toString('base64')

const hash_password = (password, salt) => {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  hash.update(salt)
  return hash.digest('hex')
}

const authenticateUserIfExists = (username, password, code_2fa, cb) => {
  dbPromise.then(db =>
    db.get('SELECT salt FROM users WHERE username = ? OR email = ?', username, username)
      .then(row => {
        if(!row) return cb(null, false)
        const hash = hash_password(password, row.salt)

        db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date FROM users WHERE (username = ? OR email = ?) AND password = ?', username, username, hash)
          .then(row => cb(null, row ? row : false))
          .catch(err => cb(null, false, { message: 'incorrect password' }))
      })
      .catch(err => (console.log(err), cb(null, false, { message: 'user not found' }))))
}

const activateTwoFactorAuthentication = (username_or_email, cb) => {
  dbPromise.then(db =>
    db.run('UPDATE users SET 2fa = 1, 2fa_secret = ?, WHERE username = ? OR email = ?', speakeasy.generateSecret({length: 20}).base32, username_or_email, username_or_email))
      .then(cb)
}

const deactivateTwoFactorAuthentication = (username_or_email, cb) => {
  dbPromise.then(db =>
    db.run('UPDATE users SET 2fa = 0, 2fa_secret = "", WHERE username = ? OR email = ?', username_or_email, username_or_email)
      .then(cb)
  )
}

const validateTwoFactorCode = (username_or_email, code, cb) => {
  dbPromise.then(db =>
    db.get('SELECT 2fa_secret FROM users WHERE 2fa = 1 and (username = ? or email = ?)', username_or_email, username_or_email)
      .then(row => speakeasy.totp.verify({
        secret: row['2fa_secret'],
        encoding: 'base32',
        token: code
      }))
      .then(cb))
}

const getUserIfExists = (username, cb) => {
  dbPromise.then(db =>
    db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date FROM users WHERE username = ?', username)
      .then(row => cb(null, row ? row : false))
      .catch(err => cb(null, false, { message: 'user not found' }))
  )
}

const getUserLimitedIfExists = (username, cb) => {
  dbPromise.then(db =>
    db.get('SELECT username, rowid as id, first_name FROM users WHERE username = ?', username) // can "rowid as id" be removed? this uses the username and nobody should need the user id of some other user so it can maybe be removed
      .then(row => cb(null, row ? row : false))
      .catch(err => cb(null, false, { message: 'user not found' }))
  )
}

const UserDataToId = (userData, cb) => cb(null, userData.id)

const IdToUserData = (id, cb) => dbPromise.then(db =>
  db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date FROM users WHERE rowid = ?', id)
    .then(row => cb(null, row ? row : false))
    .catch(err => cb(null, false, { message: 'user not found' }))
)

const addUser = (username, password, first_name, last_name, email, cb) => { // check against duplicates
  const salt = gen_salt()
  dbPromise.then(db => {
    db.get('SELECT rowid as id, * FROM users WHERE username = ? OR email = ?', username, email)
      .then(existingUser => {
        if(existingUser === undefined) {
          db.run('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))', first_name, last_name, email, username, hash_password(password, salt), salt)
            .then(x => cb(null, x))
            .catch(x => cb(x, null))
        } else {
          cb({ message: 'username or email already exists'}, null)
        }
      })

  })
}

const modifyUser = (id, { username, password, first_name, last_name, email }, cb) => {
  dbPromise.then(db =>
    db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date FROM users WHERE rowid = ?', id)
      .then(row => {
        const salt = gen_salt()
        db.run(
          'UPDATE users SET username = ?, first_name = ?, last_name = ?, email = ?, salt = ?, password = ?, modification_date = datetime("now") WHERE rowid = ?',
          username || row.username,
          first_name || row.first_name,
          last_name || row.last_name,
          email || row.email,
          password ? salt : row.salt,
          password ? hash_password(password, salt) : row.password,
          id
        )
          .then(x => cb(null, x))
          .catch(x => cb(x, null))
      })
  )
}

const deleteUser = (id, cb) => {
  dbPromise.then(db =>
    db.run('DELETE FROM users WHERE rowid = ?', id)
      .then(x => cb(null, x))
      .catch(x => cb(x, 0))
  )
}

module.exports = {
  authenticateUserIfExists,
  getUserIfExists,
  getUserLimitedIfExists,
  UserDataToId,
  IdToUserData,
  addUser,
  modifyUser,
  deleteUser,
  activateTwoFactorAuthentication,
  deactivateTwoFactorAuthentication,
  validateTwoFactorCode,
}