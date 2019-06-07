const { Pool } = require('pg')
const crypto = require('crypto')
const speakeasy = require('speakeasy')
const fs = require('fs')

console.log('[database] using postgres as database')

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

const release_then = (client) => () => {
  client.release()
}

const release_catch = (client) => (err) => {
  client.release()
  if(err) console.log(err)
}

const terminate = () => pool.end()

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
  changes: res.rowCount,
  lastID: id,
})

const insert_postgres_to_general = (res) => ({
  action: res.command,
  changes: res.rowCount
})

const authenticateUserIfExists = (username_or_email, password, code_2fa, cb) => pool.connect().then(client => 
  client.query('SELECT salt FROM auth_user WHERE (username = $1::text OR email = $1::text) AND (temp_account = to_timestamp(0) OR temp_account < current_timestamp)', [username_or_email]) // temp_account < current_timestamp will not work like this probably
    .then(_res => {
      const res = select_postgres_to_general(_res)
      if(res.count === 0) return cb(null, false)
      const hash = hash_password(password, res.rows[0].salt)
      
      return client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb FROM auth_user WHERE (username = $1::text OR email = $1::text) AND password = $2::text', [username_or_email, hash])
        .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
        .then(release_then(client))
        .catch(err => cb(err, false, { message: 'incorrect password' }))
    })
    .catch(err => {
      console.log(err)
      return cb(null, false, { message: 'user not found' })
    })
    .catch(release_catch(client))
)

const activateTwoFactorAuthentication = (username_or_email, cb) => pool.connect().then(client =>
  client.query('UPDATE auth_user SET twofa = true, twofa_secret = $1::text WHERE username = $2::text OR email = $3::text', [speakeasy.generateSecret({length: 20}).base32, username_or_email, username_or_email])  
    .then(res => cb(res))
    .then(release_then(client))
    .catch(release_catch(client))
)

const deactivateTwoFactorAuthentication = (username_or_email, cb) => pool.connect().then(client =>
  client.query('UPDATE auth_user SET twofa = false, twofa_secret = NULL WHERE username = $1::text OR email = $2::text', [username_or_email, username_or_email])
    .then(res => cb(res))
    .then(release_then(client))
    .catch(release_catch(client))
)

const validateTwoFactorCode = (username_or_email, code, cb) => pool.connect().then(client =>
  client.query('SELECT twofa_secret FROM auth_user WHERE twofa = true AND (username = $1::text OR email $2::text)', [username_or_email, username_or_email])
    .then(res => speakeasy.totp.verify({
      secret: select_postgres_to_general(res).rows[0].twofa_secret,
      encoding: 'base32',
      token: code
    }))
      .then(res => cb(res))
      .then(release_then(client))
      .catch(release_catch(client))
)

const getUserIfExists = (username, cb) => pool.connect().then(client =>
  client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb, passwordless::boolean as is_passwordless, temp_account::timestamptz FROM auth_user WHERE username = $1::text', [username])
    .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
    .then(release_then(client))
    .catch(err => cb(err, false, { message: 'user not found' }))
    .catch(release_catch(client))
)

const getUserFromEmailIfExists = (email, cb) => pool.connect().then(client =>
  client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb FROM auth_user WHERE email = $1::text', [email])
    .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
    .then(release_then(client))
    .catch(err => cb(err, false, { message: 'user not found' }))
    .catch(release_catch(client))
)

const getUserFromIdIfExists = (id, cb) => IdToUserData(id, cb)

const getUserLimitedIfExists = (username, cb) => pool.connect().then(client => 
  client.get('SELECT username, id::int, first_name FROM auth_user WHERE username = $1::text', username)
    .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
    .then(release_then(client))
    .catch(err => cb(err, false, { message: 'user not found' }))
    .catch(release_catch(client))
)

const _doesUserExist = ({id = '', username = '', email = ''}, cb) => pool.connect().then(client =>
  client.query('SELECT id::int FROM auth_user WHERE id = $1::int OR username = $2::text OR email = $3::text', [id, username, email])
    .then(res => select_postgres_to_general(res).rows[0] ? cb(true) : cb(false))
    .then(release_then(client))
    .catch(err => {
      // cb(err) // TODO: ?
    })
    .catch(release_catch(client))
)

const doesUserExistById = (id, cb) => _doesUserExist({id: id}, cb)

const doesUserExistByUsername = (username, cb) => _doesUserExist({username: username}, cb)

const doesUserExistByEmail = (email, cb) => _doesUserExist({email: email}, cb)

const getUserList = (cb) => pool.connect().then(client =>
  client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb, twofa::boolean, twofa_secret, passwordless::boolean, temp_account FROM auth_user')
    .then(res => cb(null, select_postgres_to_general(res).rows))
    .then(release_then(client))
    .catch(err => cb(null, false, { message: 'error while retrieving all users', err: err }))
    .catch(release_catch(client))
)

const UserDataToId = (userData, cb) => cb(null, userData.id)

const IdToUserData = (id, cb) => pool.connect().then(client =>
  client.query('SELECT username, id::int, first_name, last_name, email, creation_date, modification_date, account_type, metadata::jsonb, temp_account FROM auth_user WHERE id = $1::int', [id])
    .then(res => cb(null, select_postgres_to_general(res).rows[0] || false))
    .then(release_then(client))
    .catch(err => cb(null, false, { message: 'user not found', err: err }))
    .catch(release_catch(client))
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

  pool.connect().then(client =>
    client.query('SELECT id::int, * FROM auth_user WHERE username = $1::text OR email = $2::text', [username, email])
      .then(res => {
        if(res.rowCount === 0) {
          const userKeys = 'first_name, last_name, email, username, password, salt, creation_date, modification_date, account_type, metadata, twofa, twofa_secret, passwordless, temp_account'
          const userValues = '$1::text, $2::text, $3::text, $4::text, $5::text, $6::text, current_timestamp, current_timestamp, $7::account_type, $8::jsonb, $9::boolean, $10::text, $11::boolean, to_timestamp($12)::timestamptz'
          client.query('INSERT INTO auth_user ( ' + userKeys + ' ) VALUES ( ' + userValues + ' )', newUser)
            .then(() => client.query('SELECT id::int FROM auth_user WHERE username = $1::text', [username])
              .then(res => cb(null, select_postgres_to_general(res).rows[0]))
              .then(release_then(client))
            ).catch(err => cb(err, null))
        } else {
          cb({ message: 'username or email already exists' }, null)
        }
      })
      .catch(release_catch(client))
  )
}

const modifyUser = (id, { username, password, first_name, last_name, email }, cb) => {
  pool.connect().then(client =>
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
          .then(release_then(client))
          .catch(err => cb(err, null))
      }).catch(release_catch(client))
  )
}

const privilegedModifyUser = (id, { username, password, first_name, last_name, email, account_type, metadata, passwordless, temp_account }, cb) => {
  pool.connect().then(client =>
    client.query('SELECT username, id::int, first_name, last_name, email, salt, password, creation_date, modification_date, account_type, metadata::jsonb, passwordless::boolean, temp_account FROM auth_user WHERE id = $1::int', [id])
      .then(res => {
        const salt = gen_salt()
        if(password && (password.startsWith('Refresh-Token:') || password.startsWith('Get-Refresh-Token'))) {
          return cb({ message: 'cannot set password to string starting with isRefreshToken or getRefreshToken' }, null)
        }
        client.query(
          'UPDATE auth_user SET username = $1::text, first_name = $2::text, last_name = $3::text, email = $4::text, salt = $5::text, password = $6::text, modification_date = current_timestamp, account_type = $7::account_type, metadata = $8::jsonb, passwordless = $9::boolean, temp_account = to_timestamp($10::int) WHERE id = $11::int',
          [
            username || res.rows[0].username,
            first_name || res.rows[0].first_name,
            last_name || res.rows[0].last_name,
            email || res.rows[0].email,
            password ? salt : res.rows[0].salt,
            password ? hash_password(password, salt) : res.rows[0].password,
            account_type || res.rows[0].account_type,
            metadata || res.rows[0].metadata,
            passwordless !== undefined ? passwordless : (res.rows[0].passwordless || false),
            temp_account || +new Date(res.rows[0].temp_account) || 0,
            id
          ]
        )
          .then(res => cb(null, res))
          .then(release_then(client))
          .catch(err => cb(err, null))
      }).catch(release_catch(client))
  )
}

const deleteUser = (id, cb) => {
  pool.connect().then(client =>
    client.query('DELETE FROM auth_user WHERE id = $1::int', id)
      .then(res => cb(null, delete_postgres_to_general(res, id)))
      .then(release_then(client))
      .catch(err => cb(err, 0))
      .catch(release_catch(client))
  )
}

const DEVICE_BASE_JOIN = `
SELECT  device.id as device_id, user_agent, ip.ip as ip, continent, continent_code, country, country_code, 
        region, region_code, city, zip, latitude, longitude, timezone, timezone_code, isp, language, is_mobile
        is_anonymous, is_threat, is_internal, it.creation_date, device.creation_date as device_creation_date, is_revoked,
        auth_user.id as user_id, auth_user.username as username
FROM device
LEFT JOIN ip ON device.ip = ip.ip
LEFT JOIN it_device_user it ON device.id = it.device_id
LEFT JOIN auth_user ON it.user_id = auth_user.id 
`

const listDevicesByUser = (user_id, cb) => {
  pool.connect().then(client =>
    client.query(DEVICE_BASE_JOIN + 'WHERE auth_user.id = $1::int ORDER BY last_used desc', [user_id])
      .then(res => cb(null, res.rows))
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))
    )
}

const getDeviceByUserAndDeviceId = (user_id, device_id, cb) => {
  pool.connect().then(client =>
    client.query(DEVICE_BASE_JOIN + 'WHERE auth_user.id = $1::int AND device.id = $2::uuid', [user_id, device_id])
      .then(res => cb(null, res.rows[0] || null))
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))
  )
}

const getDeviceByDeviceId = (device_id, cb) => {
  pool.connect().then(client =>
    client.query(DEVICE_BASE_JOIN + 'WHERE device.id = $1::uuid', [device_id])
      .then(res => {

        if(res.rowCount === 0) return cb(null, null)

        const joined_row = {
          device_id: res.rows[0].device_id,
          user_agent: res.rows[0].user_agent,
          ip: res.rows[0].ip,
          creation_date: res.rows[0].device_creation_date,
          users: res.rows.map(row => ({ user_id: row.user_id, is_revoked: row.is_revoked, creation_date: row.creation_date }))
        }

        cb(null, joined_row)
      })
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))
  )
}

const getDeviceByUserIdAndIpAndUserAgent = (user_id, ip, user_agent, cb) => {
  pool.connect().then(client =>
    client.query(DEVICE_BASE_JOIN + 'WHERE user_id = $1::int AND ip.ip = $2::text AND user_agent = $3::text', [user_id, ip, user_agent])
      .then(res => cb(null, res.rows[0]))
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))  
  )
}

const addDevice = ({ ip, user_agent }, cb) => {
  pool.connect().then(client =>
    client.query('INSERT INTO device ( ip, user_agent ) VALUES ( $1::text, $2::text )', [ip, user_agent])
      .then(() => client.query('SELECT id FROM device WHERE ip = $1::text AND user_agent = $2::text ORDER BY creation_date desc LIMIT 1', [ip, user_agent])
        .then(res => cb(null, res.rows[0].id))
        .then(release_then(client))
        .catch(err => cb(err, null))
      ).catch(err => cb(err, null))
      .catch(release_catch(client))
  )
}

const addDeviceToUser = ({ ip, user_agent }, user_id, cb) => {
  pool.connect().then(client =>
    client.query('INSERT INTO device ( ip, user_agent ) VALUES ( $1::text, $2::text )', [ip, user_agent])
      .then(() => client.query('SELECT id FROM device WHERE ip = $1::text AND user_agent = $2::text ORDER BY creation_date desc LIMIT 1', [ip, user_agent])
        .then(res => client.query('INSERT INTO it_device_user ( user_id, device_id ) VALUES ( $1::int, $2::uuid )', [user_id, res.rows[0].id])
          .then(() => cb(null, res.rows[0].id))
          .then(release_then(client))
          .catch(err => cb(err, null))
        ).catch(err => cb(err, null))
      ).catch(err => cb(err, null))
      .catch(release_catch(client))
  )
}

const addExistingDeviceToUser = ({ user_id, device_id }, cb) => {
  pool.connect().then(client =>
    client.query('INSERT INTO it_device_user ( user_id, device_id ) VALUES ( $1::int, $2::uuid )', [user_id, device_id])
      .then(res => cb(null, res))
      .then(release_then(client))
      .catch(release_catch(client))
  )
}

const deleteDeviceByUserAndDeviceId = (user_id, device_id, cb) => {
  pool.connect().then(client =>
    client.query('DELETE FROM device WHERE id = $1::uuid AND 1 = (SELECT count(device_id) FROM it_device_user WHERE device_id = $1::uuid)', [device_id])
      .then(() => client.query('DELETE FROM it_device_user WHERE user_id = $1::int AND device_id = $2::uuid', [user_id, device_id])
        .then(res => cb(null, res.rowCount !== 0))
        .then(release_then(client))
        .catch(err => cb(err, null))
      ).catch(err => cb(err, null))
      .catch(release_catch(client))
  )
}

const deleteDeviceByDeviceId = (device_id, cb) => {
  pool.connect().then(client =>
    client.query('DELETE FROM device WHERE id = ?', [device_id])
      .then(() => client.query('DELETE FROM it_device_user WHERE device_id = ?', [device_id])
        .then(res => cb(null, res.rowCount !== 0))
        .then(release_then(client))
        .catch(err => cb(err, null))
      ).catch(err => cb(err, null))
      .catch(release_catch(client))
  )
}

const modifyDeviceByUserAndDeviceId = (user_id, device_id, changes, cb) => {
  pool.connect().then(client =>
    client.query('', [user_id, device_id])
      .then(() => {})
      .then(release_then(client))
    .catch(err => cb(err, null))
    .catch(release_catch(client))
  )
}

const modifyDeviceByDeviceId = (device_id, changes, cb) => {
  pool.connect().then(client =>
    client.query('SELECT ip, user_agent FROM device WHERE id = $1::uuid', [device_id])
      .then(res => client.query('UPDATE device SET ip = $1::text, user_agent = $2::text WHERE id = $3::uuid', [changes.ip || res.rows[0].ip, changes.user_agent || res.rows[0].user_agent, device_id])
        .then(rtn => cb(null, rtn))
      ).then(release_then(client))
    .catch(err => cb(err, null))
    .catch(release_catch(client))
  )
}

const modifyDeviceLastUsed = (device_id, user_id, last_used, cb) => {
  pool.connect().then(client =>
    client.query('UPDATE it_device_user SET last_used = $1::timestamptz WHERE device_id = $2::uuid AND user_id = $3::int', [last_used || new Date(), device_id, user_id])
      .then(rtn => cb(null, rtn))
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))
  )
}

const revokeDeviceByUserAndDeviceId = (user_id, device_id, revoke_status, cb) => {
  pool.connect().then(client => 
    client.query('UPDATE it_device_user SET is_revoked = $1::boolean WHERE user_id = $2::int AND device_id = $3::uuid', [revoke_status, user_id, device_id])
      .then(() => cb(null, revoke_status))
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))
  )
}

const getIp = (ip, cb) =>
  pool.connect().then(client =>
    client.query('SELECT * FROM ip WHERE ip = $1::text', [ip])
      .then(res => cb(null, res.rows[0] || null))
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))
  )

const addIp = (ip, data, cb) =>
  pool.connect().then(client => 
    client.query('INSERT INTO ip VALUES ( $1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text, $9::text, $10::float, $11::float, $12::text, $13::text, $14::text, $15::text[], $16::boolean, $17::boolean, $18::boolean )', [ip, ...data])
      .then(res => cb(null, res)) // replace `res` with something useful
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))
  )

const addIpInternal = (ip, cb) =>
    pool.connect().then(client =>
      client.query('INSERT INTO ip ( ip, is_internal ) VALUES ( $1::text, true )', [ip])
        .then(res => cb(null, res)) // replace `res`with something useful
        .then(release_then(client))
        .catch(err => cb(err, null))
        .catch(release_catch(client))
    )

const modifyIp = (ip, data, cb) =>
  pool.connect().then(client =>
    client.query('UPDATE ip SET continent = $1::text, continent_code = $2::text, country = $3::text, country_code = $4::text, region = $5::text, region_code = $6::text, city = $7::text, zip = $8::text, latitude = $9::float, longitude = $10::float, timezone = $11::text, timezone_code = $12::text, isp = $13::text, language = $14::text[], is_mobile = $15::boolean, is_anonymous = $16::boolean, is_threat = $17::boolean WHERE ip = $18::text', [...data, ip])
      .then(res => cb(null, res)) // replace `res` with something useful
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))
  )

const deleteIp = (ip, cb) =>
  pool.connect().then(client =>
    client.query('DELETE ip WHERE ip = $1::text', [ip])
      .then(res => cb(null, res)) // replace `res` with something useful
      .then(release_then(client))
      .catch(err => cb(err, null))
      .catch(release_catch(client))
  )

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
    getByUserIdAndIpAndUserAgent: getDeviceByUserIdAndIpAndUserAgent,
    add: addDeviceToUser,
    addWithoutUserId: addDevice,
    addExistingToUser: addExistingDeviceToUser,
    delete: deleteDeviceByUserAndDeviceId,
    deleteWithoutUserId: deleteDeviceByDeviceId,
    modify: modifyDeviceByUserAndDeviceId,
    modifyWithoutUserId: modifyDeviceByDeviceId,
    modifyLastUsed: modifyDeviceLastUsed,
    revoke: revokeDeviceByUserAndDeviceId,
  },
  Ip: {
    get: getIp,
    add: addIp,
    addInternal: addIpInternal,
    modify: modifyIp,
    delete: deleteIp
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
  getDeviceByUserIdAndIpAndUserAgent,
  addDeviceToUser,
  addDevice,
  addExistingDeviceToUser,
  deleteDeviceByUserAndDeviceId,
  deleteDeviceByDeviceId,
  modifyDeviceByUserAndDeviceId,
  modifyDeviceByDeviceId,
  modifyDeviceLastUsed,
  revokeDeviceByUserAndDeviceId,
  getIp,
  addIp,
  modifyIp,
  deleteIp,
  terminate
}