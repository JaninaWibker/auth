const { Pool } = require('pg')
const crypto = require('crypto')
const speakeasy = require('speakeasy')
const fs = require('fs')

const config = {
  database: 'auth',
  host: process.env.POSTGRES_SERVER,
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync(process.env.POSTGRES_CA, 'utf8'),
    key: fs.readFileSync(process.env.POSTGRES_KEY, 'utf8'),
    cert: fs.readFileSync(process.env.POSTGRES_CERT, 'utf8')
  }
}

const pool = new Pool(config)

// client.connect((err) => {
//   if (err) {
//     console.error('error connecting', err.stack)
//   } else {
//     console.log('connected')
//     client.end()
//   }
// })

const gen_salt = () => crypto.randomBytes(48).toString('base64')

const hash_password = (password, salt) => {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  hash.update(salt)
  return hash.digest('hex')
}

const authenticateUserIfExists = (username, password, code_2fa, cb) => {}

const activateTwoFactorAuthentication = (username_or_email, cb) => {}

const deactivateTwoFactorAuthentication = (username_or_email, cb) => {}

const validateTwoFactorCode = (username_or_email, code, cb) => {}

const getUserIfExists = (username, cb) => {}

const getUserFromEmailIfExists = (email, cb) => {}

const getUserFromIdIfExists = (id, cb) => IdToUserData(id, cb)

const getUserLimitedIfExists = (username, cb) => {}

const _doesUserExist = ({id = '', username = '', email = ''}, cb) => {}

const doesUserExistById = (id, cb) => _doesUserExist({id: id}, cb)

const doesUserExistByUsername = (username, cb) => _doesUserExist({username: username}, cb)

const doesUserExistByEmail = (email, cb) => _doesUserExist({email: email}, cb)

const getUserList = (cb) => {}

const UserDataToId = (userData, cb) => cb(null, userData.id)

const IdToUserData = (id, cb) => {}

const addUser = (username, password, first_name, last_name, email, account_type = 'default', metadata = {}, is_passwordless=false, temp_account=0, cb) => {}

const modifyUser = (id, { username, password, first_name, last_name, email }, cb) => {}

const privilegedModifyUser = (id, { username, password, first_name, last_name, email, account_type, metadata, temp_account }, cb) => {}

const deleteUser = (id, cb) => {}

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
