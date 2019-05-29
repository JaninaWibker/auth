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
  ssl: process.env.POSTGRES_USE_SSL === 'true' ? {
    rejectUnauthorized: false,
    ca: fs.readFileSync(process.env.POSTGRES_CA, 'utf8'),
    key: fs.readFileSync(process.env.POSTGRES_KEY, 'utf8'),
    cert: fs.readFileSync(process.env.POSTGRES_CERT, 'utf8')
  } : undefined
}

const pool = new Pool(config)

pool.on('error', (err) => {
  console.error('An idle client has experienced an error', err.stack)
})

const clientPromise = pool.connect()

const gen_salt = () => crypto.randomBytes(48).toString('base64')

const hash_password = (password, salt) => {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  hash.update(salt)
  return hash.digest('hex')
}

const select_postgres_to_general = (res) => ({
  action: res.command,
  count: res.rowCount,
  rows: res.rows
})

const delete_postgres_to_general = (res, id) => ({
  action: res.command,
  changes: res.rowCound,
  lastID: id,
})

const authenticateUserIfExists = (username_or_email, password, code_2fa, cb) => clientPromise.then(client => 
  client.query('SELECT salt FROM auth_user WHERE (username = $1::text OR email = $1::text) AND (temp_account = to_timestamp(0) OR temp_account < current_timestamp)', [username_or_email]) // temp_account < current_timestamp will not work like this probably
    .then(_res => {
      const res = select_postgres_to_general(_res)
      if(res.count === 0) return cb(null, false)
      const hash = hash_password(password, res.rows[0].salt)
      
      client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb FROM auth_user WHERE (username = $1::text OR email = $1::text) AND password = $2::text', [username_or_email, hash])
        .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
        .catch(err => cb(err, false, { message: 'incorrect password' }))
    })
    .catch(err => {
      console.log(err)
      cb(null, false, { message: 'user not found' })
    })
)

const activateTwoFactorAuthentication = (username_or_email, cb) => clientPromise.then(client =>
  client.query('UPDATE auth_user SET twofa = true, twofa_secret = $1::text WHERE username = $2::text OR email = $3::text', [speakeasy.generateSecret({length: 20}).base32, username_or_email, username_or_email])  
)

const deactivateTwoFactorAuthentication = (username_or_email, cb) => clientPromise.then(client =>
  client.query('UPDATE auth_user SET twofa = false, twofa_secret = NULL WHERE username = $1::text OR email = $2::text', [username_or_email, username_or_email])
    .then(cb)
)

const validateTwoFactorCode = (username_or_email, code, cb) => clientPromise.then(client =>
  client.query('SELECT twofa_secret FROM auth_user WHERE twofa = true AND (username = $1::text OR email $2::text)', [username_or_email, username_or_email])
    .then(res => speakeasy.totp.verify({
      secret: select_postgres_to_general(res).rows[0].twofa_secret,
      encoding: 'base32',
      token: code
    }))
      .then(cb)
)

const getUserIfExists = (username, cb) => clientPromise.then(client =>
  client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb FROM auth_user WHERE username = $1::text', [username])
    .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
    .catch(err => cb(null, false, { message: 'user not found' }))
)

const getUserFromEmailIfExists = (email, cb) => clientPromise.then(client =>
  client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb FROM auth_user WHERE email = $1::text', [email])
    .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
    .catch(err => cb(null, false, { message: 'user not found' }))
)

const getUserFromIdIfExists = (id, cb) => IdToUserData(id, cb)

const getUserLimitedIfExists = (username, cb) => clientPromise.then(client => 
  client.get('SELECT username, id::int, first_name FROM auth_user WHERE username = $1::text', username)
    .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
    .catch(err => cb(null, false, { message: 'user not found' }))  
)

const _doesUserExist = ({id = '', username = '', email = ''}, cb) => clientPromise.then(client =>
  client.query('SELECT id::int FROM auth_user WHERE id = $1::int OR username = $2::text OR email = $3::text', [id, username, email])
    .then(res => select_postgres_to_general(res).rows[0] ? cb(true) : cb(false))
)

const doesUserExistById = (id, cb) => _doesUserExist({id: id}, cb)

const doesUserExistByUsername = (username, cb) => _doesUserExist({username: username}, cb)

const doesUserExistByEmail = (email, cb) => _doesUserExist({email: email}, cb)

const getUserList = (cb) => clientPromise.then(client =>
  client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb, twofa::boolean, twofa_secret, passwordless::boolean, temp_account FROM auth_user')
    .then(res => cb(null, select_postgres_to_general(res).rows))
    .catch(err => cb(null, false, { message: 'error while retrieving all users', err: err }))
)

const UserDataToId = (userData, cb) => cb(null, userData.id)

const IdToUserData = (id, cb) => clientPromise.then(client =>
  client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb, temp_account FROM auth_user WHERE id = $1::int', [id])
    .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
    .catch(err => cb(null, false, { message: 'user not found', err: err }))
)

const addUser = (username, password, first_name, last_name, email, account_type = 'default', metadata = {}, is_passwordless=false, temp_account=0, cb) => {
  if(password.startsWith('Refresh-Token:') || password.startsWith('Get-Refresh-Token:')) {
    return cb({ message: 'cannot set password to string starting with Refresh-Token or Get-Refresh-Token' }, null)
  }

  const salt = gen_salt()

  const newUser = [
    first_name,
    last_name,
    email,
    username,
    hash_password(password, salt),
    salt,
    account_type,
    metadata,
    false, // 2fa
    null, // 2fa_secret
    is_passwordless,
    temp_account
  ]

  clientPromise.then(client =>
    client.query('SELECT id::int, * FROM auth_user WHERE username = $1::text OR email $2::text', username, email)
      .then(res => {
        if(res.rowCount === 0) {
          const userKeys = 'first_name, last_name, email, username, password, salt, creation_date, modification_date, account_type, metadata, twofa, twofa_secret, passwordless, temp_account'
          const userValues = '$1::text, $2::text, $3::text, $4::text, $5::text, $6::text, current_timestamp, current_timestamp, $7::text, $8::jsonb, $9::boolean, $10::text, $11::boolean, $12::timestamptz'
          client.query('INSERT INTO auth_user ( ' + userKeys + ' ) VALUES ( ' + userValues + ' )', newUser)
            .then(res => cb(null, select_postgres_to_general(res).rows[0]))
            .catch(err => cb(err, null))
        } else {
          cb({ message: 'username or email already exists' }, null)
        }
      })  
  )
}

const modifyUser = (id, { username, password, first_name, last_name, email }, cb) => {
  clientPromise.then(client =>
    client.query('SELECT username, id::int, first_name, last_name, email, salt, password, creation_date, modification_date FROM auth_user WHERE id = $1::int', [id])
      .then(res => {
        const salt = gen_salt()
        if(password && (password.startsWith('Refresh-Token:') || password.startsWith('Get-Refresh-Token'))) {
          return cb({ message: 'cannot set password to string starting with isRefreshToken or getRefreshToken' }, null)
        }
        client.query(
          'UPDATE auth_user SET username = $1::text, first_name = $2::text, last_name = $3::text, email = $4::text, salt = $5::text, password = $6::text, modification_date = current_timestamp WHERE id = $7::int',
          [
            username || res.rows[0].username,
            first_name || res.rows[0].first_name,
            last_name || res.rows[0].last_name,
            email || res.rows[0].email,
            password ? salt : res.rows[0].salt,
            password ? hash_password(password, salt) : res.rows[0].password,
            id
          ]
        )
          .then(res => cb(null, res))
          .catch(err => cb(err, null))
      })
  )
}

const privilegedModifyUser = (id, { username, password, first_name, last_name, email, account_type, metadata, temp_account }, cb) => {
  clientPromise.then(client =>
    client.query('SELECT username, id::int, first_name, last_name, email, salt, password, creation_date, modification_date, account_type, metadata::jsonb, temp_account FROM auth_user WHERE id = $1::int', [id])
      .then(res => {
        const salt = gen_salt()
        if(password && (password.startsWith('Refresh-Token:') || password.startsWith('Get-Refresh-Token'))) {
          return cb({ message: 'cannot set password to string starting with isRefreshToken or getRefreshToken' }, null)
        }
        client.query(
          'UPDATE auth_user SET username = $1::text, first_name = $2::text, last_name = $3::text, email = $4::text, salt = $5::text, password = $6::text, modification_date = current_timestamp, account_type = $7::text, metadata = $8::text, temp_account = to_timestamp($9::int) WHERE id = $10::int',
          [
            username || res.rows[0].username,
            first_name || res.rows[0].first_name,
            last_name || res.rows[0].last_name,
            email || res.rows[0].email,
            password ? salt : res.rows[0].salt,
            password ? hash_password(password, salt) : res.rows[0].password,
            account_type || res.rows[0].account_type,
            metadata || res.rows[0].metadata,
            temp_account || res.rows[0].temp_account || 0,
            id
          ]
        )
          .then(res => cb(null, res))
          .catch(err => cb(err, null))
      })  
  )
}

const deleteUser = (id, cb) => {
  clientPromise.then(client =>
    client.query('DELETE FROM auth_user WHERE id = $1::int', id)
      .then(res => cb(null, delete_postgres_to_general(res, id)))
      .catch(err => cb(err, 0))
  )
}

const DEVICE_BASE_JOIN = `
SELECT id, user_agent, ip, creation_date, is_revoked FROM device
LEFT JOIN it_device_user it ON device.id === it.device_id
LEFT JOIN auth_user ON it.user_id === auth_user.id 
`

const listDevicesByUser = (user_id, cb) => {
  clientPromise.then(client =>
    client.query(DEVICE_BASE_JOIN + 'WHERE auth_user.id === $1::int', [user_id]))
}

const getDeviceByUserAndDeviceId = (user_id, device_id, cb) => {
  clientPromise.then(client =>
    client.query(DEVICE_BASE_JOIN + 'WHERE auth_user.id = $1::int AND device.id = $2::uuid', [user_id, device_id])
  )
}

const getDeviceByDeviceId = (device_id, cb) => {
  clientPromise.then(client =>
    client.query(DEVICE_BASE_JOIN + 'WHERE device.id = $1::uuid', [device_id])
  )
}

const addDevice = (device, cb) => {
  clientPromise.then(client =>
    client.query('', [])
  )
}

const deleteDeviceByUserAndDeviceId = (user_id, device_id) => {
  clientPromise.then(client =>
    client.query('DELETE FROM device WHERE id = $1::uuid AND 1 = (SELECT count(device_id) FROM it_device_user WHERE device_id = $1::uuid); DELETE FROM it_device_user WHERE user_id = $2::int AND device_id = $1::uuid;', [device_id, user_id])
  )
}

const deleteDeviceByDeviceId = (device_id, cb) => {
  clientPromise.then(client =>
    client.query('DELETE FROM device WHERE id = $1::uuid; DELETE FROM it_device_user WHERE device_id = $1::uuid;', [device_id])
  )
}

const modifyDeviceByUserAndDeviceId = (user_id, device_id, changes, cb) => {
  clientPromise.then(client =>
    client.query('', [user_id, device_id])
  )
}

const modifyDeviceByDeviceId = (device_id, changes, cb) => {
  clientPromise.then(client =>
    client.query('', [device_id])
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
  Device: {
    list: listDevicesByUser,
    get: getDeviceByUserAndDeviceId,
    getWithoutUserId: getDeviceByDeviceId,
    add: addDevice,
    delete: deleteDeviceByUserAndDeviceId,
    deleteWithoutUserId: deleteDeviceByDeviceId,
    modify: modifyDeviceByUserAndDeviceId,
    modifyWithoutUserId: modifyDeviceByDeviceId,
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
  listDevicesByUser,
  getDeviceByUserAndDeviceId,
  getDeviceByDeviceId,
  addDevice,
  deleteDeviceByUserAndDeviceId,
  deleteDeviceByDeviceId,
  modifyDeviceByUserAndDeviceId,
  modifyDeviceByDeviceId
}