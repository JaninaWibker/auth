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

const select_sqlite_to_general = (rows) => ({
  action: 'SELECT',
  count: rows.length,
  rows: rows
})

const select_sqlite_get_to_general = (row) => select_sqlite_to_general([row])

const delete_sqlite_to_general = (res) => ({
  action: res.sql,
  changes: res.changes,
  lastID: res.lastID
})

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
      .catch(err => {
        console.log(err);
        cb(null, false, { message: 'user not found' })
      })
  )
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
    db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date, account_type, metadata, passwordless as is_passwordless, temp_account FROM users WHERE username = ?', username)
      .then(row => cb(null, select_sqlite_get_to_general(row).rows[0] || false))
      .catch(err => cb(err, false, { message: 'user not found' }))
  )
}

const getUserFromEmailIfExists = (email, cb) => {
  dbPromise.then(db =>
    db.get('SELECT username, rowid as id, first_name, last_name, email, creation_date, modification_date, account_type, metadata FROM users WHERE email = ?', email)
      .then(row => cb(null, select_sqlite_get_to_general(row).rows[0] || false))
      .catch(err => cb(err, false, { message: 'user not found' }))
  )
}

const getUserFromIdIfExists = (id, cb) => IdToUserData(id, cb)

const getUserLimitedIfExists = (username, cb) => {
  dbPromise.then(db =>
    db.get('SELECT username, rowid as id, first_name FROM users WHERE username = ?', username) // can "rowid as id" be removed? this uses the username and nobody should need the user id of some other user so it can maybe be removed
      .then(row => cb(null, select_sqlite_get_to_general(row).rows[0] || false))
      .catch(err => cb(err, false, { message: 'user not found' }))
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
      .then(res => cb(null, select_sqlite_to_general(res).rows || false))
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

const privilegedModifyUser = (id, { username, password, first_name, last_name, email, account_type, metadata, passwordless, temp_account }, cb) => {
  dbPromise.then(db => 
    db.get('SELECT username, rowid as id, first_name, last_name, email, salt, password, creation_date, modification_date, account_type, metadata, passwordless, temp_account FROM users WHERE rowid = ?', id)
      .then(row => {
        const salt = gen_salt()
        if(password && (password.startsWith('Refresh-Token:') || password.startsWith('Get-Refresh-Token'))) {
          return cb({ message: 'cannot set password to string starting with isRefreshToken or getRefreshToken' }, null)
        }
        db.run(
          'UPDATE users SET username = ?, first_name = ?, last_name = ?, email = ?, salt = ?, password = ?, modification_date = datetime("now"), account_type = ?, metadata = ?, passwordless = ?, temp_account = ? WHERE rowid = ?',
          username || row.username,
          first_name || row.first_name,
          last_name || row.last_name,
          email || row.email,
          password ? salt : row.salt,
          password ? hash_password(password, salt) : row.password,
          account_type || row.account_type,
          metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : row.metadata,
          passwordless !== undefined ? passwordless : (row.passwordless || 0),
          temp_account !== undefined ? temp_account : (row.temp_account || 0),
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
      .then(res => cb(null, delete_sqlite_to_general(res)))
      .catch(err => cb(err, 0))
  )
}

const DEVICE_BASE_JOIN = `
SELECT  device.id as device_id, user_agent, ip.ip as ip, continent, continent_code, country, country_code, 
        region, region_code, city, zip, latitude, longitude, timezone, timezone_code, isp, language, is_mobile, 
        is_anonymous, is_threat, is_internal, it.creation_date, device.creation_date as device_creation_date, is_revoked
FROM device
LEFT JOIN ip ON device.ip = ip.ip
LEFT JOIN it_device_user it ON device.id = it.device_id
LEFT JOIN users ON it.user_id = users.id 
`

const listDevicesByUser = (user_id, cb) => {
  dbPromise.then(db => 
    db.all(DEVICE_BASE_JOIN + 'WHERE users.id = ? ORDER BY last_used desc', user_id)
      .then(rows => cb(null, rows))
      .catch(err => cb(err, null))
  )
}

const getDeviceByUserAndDeviceId = (user_id, device_id, cb) => {
  dbPromise.then(db => {
    db.all(DEVICE_BASE_JOIN + 'WHERE users.id = ? AND device.id = ?', user_id, device_id)
      .then(rows => cb(null, rows[0] || null))
      .catch(err => cb(err, null))
  })
}

const getDeviceByDeviceId = (device_id, cb) => {
  dbPromise.then(db => {
    db.all(DEVICE_BASE_JOIN + 'WHERE device.id = ?', device_id)
      .then(rows => {
        const joined_rows = {
          device_id: rows[0].device_id,
          user_agent: rows[0].user_agent,
          ip: rows[0].ip,
          creation_date: rows[0].device_creation_date,
          users: rows.map(row => ({ user_id: row.user_id, is_revoked: row.is_revoked, creation_date: row.creation_date }))
        }

        cb(null, joined_rows)
      })
      .catch(err => cb(err, null))
  })
}

const getDeviceByUserIdAndIpAndUserAgent = (user_id, ip, user_agent, cb) => {
  dbPromise.then(db => {
    db.all(DEVICE_BASE_JOIN + 'WHERE user_id = ? AND ip = ? AND user_agent = ?', user_id, ip, user_agent)
      .then(res => cb(null, res.rows[0]))
      .catch(err => cb(err, null))
  })
}

const addDevice = ({ ip, user_agent }, cb) => {
  dbPromise.then(db => {
    db.run('INSERT INTO device ( ip, user_agent ) VALUES ( ?, ? )', ip, user_agent)
      .then(() => db.get('SELECT id FROM device WHERE ip = ? AND user_agent = ? ORDERY BY creation_date desc', ip, user_agent)
        .then(row => cb(err, row.id))
        .catch(err => cb(err, null))
      ).catch(err => cb(err, null))
  })
}

const addDeviceToUser = ({ ip, user_agent }, user_id, cb) => {
  dbPromise.then(db => {
    db.run('INSERT INTO device ( ip, user_agent ) VALUES ( ?, ? )', ip, user_agent)
      .then(() => db.get('SELECT id FROM device WHERE ip = ? AND user_agent = ? ORDERY BY creation_date desc', ip, user_agent)
        .then(row => db.run('INSERT INTO it_device_user ( user_id, device_id ) VALUES ( ?, ? )', user_id, row.id)
          .then(() => cb(null, row.id))
          .catch(err => cb(err, null))
        ).catch(err => cb(err, null))
      ).catch(err => cb(err, null))
  })
}

const addExistingDeviceToUser = ({ user_id, device_id }, cb) => {
  dbPromise.then(db => {
    db.run('INSERT INTO it_device_user ( user_id, device_id) VALUES ( ?, ? )', user_id, device_id)
      .then(() => cb(null, null))
      .catch(err => cb(err, null))
  })
}

const deleteDeviceByUserAndDeviceId = (user_id, device_id, cb) => {
  dbPromise.then(db => {
    db.run('DELETE FROM device WHERE ip = ? AND 1 = (SELECT count(device_id) FROM it_device_user WHERE device_id = ?)', device_id, device_id)
      .then(() => db.run('DELETE FROM it_device_user WHERE user_id = ? AND device_id = ?', user_id, device_id)
        .then(res => cb(null, res.changes !== 0))
        .catch(err => cb(err, null))
      ).catch(err => cb(err, null))
  })
}

const deleteDeviceByDeviceId = (device_id, cb) => {
  dbPromise.then(db => {
    db.run('DELETE FROM device WHERE id = ?', device_id)
      .then(() => db.run('DELETE FROM it_device_user WHERE device_id = ?', device_id)
        .then(res => cb(null, res.changes !== 0))
        .catch(err => cb(err, null))
      ).catch(err => cb(err, null))
  })
}

const modifyDeviceByUserAndDeviceId = (user_id, device_id, changes, cb) => {
  dbPromise.then(db => {
    db.run('', user_id, device_id)
      .then(() => {})
      .catch(err => cb(err, null))
  })
}

const modifyDeviceByDeviceId = (device_id, changes, cb) => {
  dbPromise.then(db =>
    db.all('SELECT ip, user_agent FROM device WHERE id = ?', device_id)
      .then(res => db.run('UPDATE device SET ip = ?, user_agent = ?', changes.ip || res.rows[0].ip, changes.user_agent || res.rows[0].user_agent)
        .then(rtn => cb(null, rtn))
        .catch(err => cb(err, null))
      )
      .catch(err => cb(err, null))
  )
}

const modifyDeviceLastUsed = (device_id, user_id, last_used, cb) => {
  dbPromise.then(db => {
    db.run('UPDATE it_device_user SET last_used = ? WHERE device_id = ? AND user_id = ?', last_used, device_id, user_id)
      .then(rtn => cb(null, rtn))
      .catch(err => cb(err, null))
  })
}

const revokeDeviceByUserAndDeviceId = (user_id, device_id, revoke_status, cb) => {
  dbPromise.then(db => {
    db.run('UPDATE it_device_user SET is_revoked = ? WHERE user_id = ? AND device_id = ?', revoke_status, user_id, device_id)
      .then(() => cb(null, revoke_status))
      .catch(err => cb(err, null))
  })
}

const getIp = (ip, cb) => {
  dbPromise.then(db =>
    db.all('SELECT * FROM ip WHERE ip = ?', ip) // when using all, it maybe does not error when no rows are returned
      .then(rows => cb(null, rows[0] || null))
      .catch(err => cb(err, null))
  )
}

const addIp = (ip, data, cb) => {
  dbPromise.then(db =>
    db.run('INSERT INTO ip VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )', ip, ...data)
      .then(res => cb(null, res))
      .catch(err => cb(err, null))
  )
}

const addIpInternal = (ip, cb) => {
  dbPromise.then(db =>
    db.run('INSERT INTO ip ( ip, is_internal ) VALUES ( ?, 1 )', ip)
      .then(res =>  cb(null, res))
      .catch(err => cb(err, null))  
  )
}

const modifyIp = (ip, data, cb) => {
  dbPromise.then(db =>
    db.run('UPDATE ip SET continent = ?, continent_code = ?, country = ?, country_code = ?, region = ?, region_code = ?, city = ?, zip = ?, latitude = ?, longitude = ?, timezone = ?, timezone_code = ?, isp = ?, language = ?, is_mobile = ?, is_anonymous = ?, is_threat = ? WHERE ip = ?', ...data, ip)
      .then(res => cb(null, res))
      .catch(err => cb(err, null))
  )
}

const deleteIp = (ip, cb) => {
  dbPromise.then(db =>
    db.run('DELETE ip WHERE ip = ?', ip)
      .then(res => cb(null, res))
      .catch(err => cb(err, null))  
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
  deleteIp
}