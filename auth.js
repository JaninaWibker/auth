const jwt = require('jsonwebtoken')
const passportJWT = require('passport-jwt')
const _cache = require('memory-cache')
const cache = new _cache.Cache()
const db = require('./db.js')
const RSA = require('node-rsa')

const auth = (private_key, public_key, onAdd=() => {}, onDelete=() => {}) => {

  const rsa = new RSA(private_key)
  rsa.importKey(public_key, 'public')

  console.log(private_key.substring(0, 96), '\n', public_key.substring(0, 96))

  const extractJWT = passportJWT.ExtractJwt
  const JWTStrategy = passportJWT.Strategy


  const jwtOptions = {
    jwtFromRequest:  extractJWT.fromAuthHeaderAsBearerToken(),
    privateKey: private_key,
    publicKey: public_key,
    secretOrKey: public_key,
    algorithm: 'RS256',
    algorithms: ['RS256']
  }

  const addToCache = (id, token, payload, time) => {
    return onAdd(id, token, payload)
      .then(() => cache.put(id, token, time)) // TODO - order
      .catch(console.log)
  }

  const removeFromCache = (id, payload={account_type: 'default'}) => {
    return onDelete(id, cache.get(id), payload)
      .then(() => cache.del(id))
  }

  const strategy = new JWTStrategy(jwtOptions, (jwt_payload, cb) => {
    console.log('payload received: ', jwt_payload)
    db.getUserIfExists(jwt_payload.username, (err, user) => {
      if(err || !user) {
        console.log('[strategy] authorization failed. JWT expired or user not found')
        cb(err, null, null)
      } else {
        console.log('[strategy] authorization successful (' + user.id + ': ' + cache.get(user.id).substring(0, 96) + ' )')
        const checkCache = true
        if(!checkCache || cache.get(user.id) !== null) cb(null, user, null)
        else cb(null, false, { message: 'token expired' })
      }
    })
  })

  const signJwtNoCheck = (user) => jwt.sign({
    id: user.id,
    username: user.username,
    account_type: user.account_type,
    iss: 'accounts.jannik.ml',
    partial_key: false,
    enabled_2fa: user['2fa_enabled'] === 1 ? true : false
  }, jwtOptions.privateKey, { algorithm: jwtOptions.algorithm })

  const login = (username, password, cb) =>
    db.authenticateUserIfExists(username, password, null, (err, user, info) => {
      console.log('[auth/login]', err, { id: user.id, username: user.username })
      if(user) {
        const payload = { id: user.id, username: user.username, iss: 'accounts.jannik.ml', partial_key: false, enabled_2fa: user['2fa_enabled'] === 1 ? true : false, account_type: user.account_type }
        const token = jwt.sign(payload, jwtOptions.privateKey, { algorithm: jwtOptions.algorithm})
        console.log('[cache] add *' + user.id + '*: ' + token.substring(0, 96))
        addToCache(user.id, token, payload, 30 * 60 * 1000)
          .then(() => cb(err, token))
      } else {
        cb(err, false)
      }
    })

  const Logout = (id, cb) => removeFromCache(id).then(cb)

  const validateRegisterToken = (register_token) => {
    const data = JSON.parse(Buffer.from(rsa.decryptPublic(Buffer.from(register_token.replace(/\-/g, '+').replace(/\_/g, '/'), 'base64')), 'base64').toString('ascii'))
    if(data && data.account_type) return { message: 'successful', ...data }
    else return { message: 'failure', ...data }
  }

  const generateRegisterToken = (data) => {
    return Buffer.from(rsa.encryptPrivate(Buffer.from(JSON.stringify(data))))
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
  }

  return {
    JWTStrategy: strategy,
    Login: login,
    Logout: Logout,
    signJwtNoCheck: signJwtNoCheck,
    manualAddToCache: addToCache,
    validateRegisterToken: validateRegisterToken,
    generateRegisterToken: generateRegisterToken,
  }
}

module.exports = auth