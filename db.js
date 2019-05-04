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
    db.get('SELECT salt FROM users WHERE (username = ? OR email = ?) AND (temp_account = 0 OR temp_account < datetime("now"))', username, username)
      .then(row => {
        if(!row) return cb(null, false)
        const hash = hash_password(password, row.salt)

        db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date, account_type, metadata FROM users WHERE (username = ? OR email = ?) AND password = ?', username, username, hash)
          .then(row => cb(null, row ? row : false))
          .catch(err => cb(err, false, { message: 'incorrect password' }))
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
    db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date, account_type, metadata FROM users WHERE username = ?', username)
      .then(row => cb(null, row ? row : false))
      .catch(err => cb(null, false, { message: 'user not found' }))
  )
}

const getUserFromEmailIfExists = (email, cb) => {
  dbPromise.then(db =>
    db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date, account_type, metadata FROM users WHERE email = ?', email)
      .then(row => cb(null, row ? row : false))
      .catch(err => cb(null, false, { message: 'user not found' }))
  )
}

const getUserFromIdIfExists = (id, cb) => IdToUserData(id, cb)

const getUserLimitedIfExists = (username, cb) => {
  dbPromise.then(db =>
    db.get('SELECT username, rowid as id, first_name FROM users WHERE username = ?', username) // can "rowid as id" be removed? this uses the username and nobody should need the user id of some other user so it can maybe be removed
      .then(row => cb(null, row ? row : false))
      .catch(err => cb(null, false, { message: 'user not found' }))
  )
}

const _doesUserExist = ({id = '', username = '', email = ''}, cb) => {
  dbPromise.then(db =>
    db.get('SELECT rowid as id FROM users WHERE id = ? OR username = ? OR email = ?', id, username, email)
      .then(row => cb(true))
      .catch(err => cb(false))
  )
}

const doesUserExistById = (id, cb) => _doesUserExist({id: id}, cb)

const doesUserExistByUsername = (username, cb) => _doesUserExist({username: username}, cb)

const doesUserExistByEmail = (email, cb) => _doesUserExist({email: email}, cb)

const getUserList = (cb) => {
  dbPromise.then(db =>
    db.all('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date, account_type, metadata FROM users')
      .then(rows => cb(null, rows ? rows : false))
      .catch(err => cb(null, false, { message: 'error while retrieving all users', err: err }))
  )
}

const UserDataToId = (userData, cb) => cb(null, userData.id)

const IdToUserData = (id, cb) => dbPromise.then(db =>
  db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date, account_type, metadata FROM users WHERE rowid = ?', id)
    .then(row => cb(null, row ? row : false))
    .catch(err => cb(null, false, { message: 'user not found', err: err }))
)

const addUser = (username, password, first_name, last_name, email, account_type = 'default', metadata = {}, is_passwordless=false, temp_account=0, cb) => {
  if(password.startsWith('Refresh-Token:') || password.startsWith('Get-Refresh-Token:')) {
    return cb({ message: 'cannot set password to string starting with Refresh-Token or Get-Refresh-Token' }, null)
  }

  const salt = gen_salt()

  const newUser = {
    '@first_name': first_name,
    '@last_name': last_name,
    '@email': email,
    '@username': username,
    '@password': hash_password(password, salt),
    '@salt': salt,
    '@account_type': account_type,
    '@metadata': JSON.stringify(metadata) || '{}',
    '@2fa': 0,
    '@2fa_secret': '',
    '@is_passwordless': is_passwordless,
    '@temp_account': temp_account
  }

  dbPromise.then(db => {
    db.get('SELECT rowid as id, * FROM users WHERE username = ? OR email = ?', username, email)
      .then(existingUser => {
        if(existingUser === undefined) {

          db.run(`INSERT INTO users (
              first_name, last_name, email, username, password, salt, creation_date, modification_date, account_type, metadata, \`2fa\`, \`2fa_secret\`, passwordless, temp_account
            ) VALUES (
            @first_name, @last_name, @email, @username,
            @password, @salt,
            datetime("now"), datetime("now"), @account_type, @metadata,
            @2fa, @2fa_secret, @is_passwordless, @temp_account
          )`, newUser)
            .then(x => cb(null, x))
            .catch(x => cb(x, null))
        } else {
          cb({ message: 'username or email already exists' }, null)
        }
      })

  })
}

const modifyUser = (id, { username, password, first_name, last_name, email }, cb) => {
  dbPromise.then(db =>
    db.get('SELECT username, rowid as id, first_name, last_name, email, salt, password, creation_date, modification_date FROM users WHERE rowid = ?', id)
      .then(row => {
        const salt = gen_salt()
        if(password && (password.startsWith('Refresh-Token:') || password.startsWith('Get-Refresh-Token'))) {
          return cb({ message: 'cannot set password to string starting with isRefreshToken or getRefreshToken' }, null)
        }
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

const privilegedModifyUser = (id, { username, password, first_name, last_name, email, account_type, metadata, temp_account }, cb) => {
  dbPromise.then(db => 
    db.get('SELECT username, rowid as id, first_name, last_name, email, salt, password, creation_date, modification_date, account_type, metadata FROM users WHERE rowid = ?', id)
      .then(row => {
        const salt = gen_salt()
        if(password && (password.startsWith('Refresh-Token:') || password.startsWith('Get-Refresh-Token'))) {
          return cb({ message: 'cannot set password to string starting with isRefreshToken or getRefreshToken' }, null)
        }
        db.run(
          'UPDATE users SET username = ?, first_name = ?, last_name = ?, email = ?, salt = ?, password = ?, modification_date = datetime("now"), account_type = ?, metadata = ?, temp_account = ? WHERE rowid = ?',
          username || row.username,
          first_name || row.first_name,
          last_name || row.last_name,
          email || row.email,
          password ? salt : row.salt,
          password ? hash_password(password, salt) : row.password,
          account_type || row.account_type,
          metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : row.metadata,
          temp_account || row.temp_account || 0,
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
  User: {
    add: addUser,
    modify: modifyUser,
    privilegedModify: privilegedModifyUser,
    delete: deleteUser,
    get: {
      byId: getUserFromIdIfExists,
      byUsername: getUserIfExists,
      byEmail: getUserFromEmailIfExists
    },
    exist: {
      byId: doesUserExistById,
      byUsernaem: doesUserExistByUsername,
      byEmail: doesUserExistByEmail
    },
    list: getUserList,
    authenticate: authenticateUserIfExists
  },
  authenticateUserIfExists,
  getUserIfExists,
  getUserFromEmailIfExists,
  getUserFromIdIfExists,
  getUserLimitedIfExists,
  getUserList,
  doesUserExistById,
  doesUserExistByUsername,
  doesUserExistByEmail,
  UserDataToId,
  IdToUserData,
  addUser,
  modifyUser,
  privilegedModifyUser,
  deleteUser,
  activateTwoFactorAuthentication,
  deactivateTwoFactorAuthentication,
  validateTwoFactorCode,
}
