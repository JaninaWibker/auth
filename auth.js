const jwt = require('jsonwebtoken')
const passportJWT = require('passport-jwt')
const _cache = require('memory-cache')
const cache = new _cache.Cache()
const db = require('./db.js')

const auth = (private_key, public_key, onAdd=() => {}, onDelete=() => {}) => {

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

  const addToCache = (id, token, time) => {
    return onAdd(id, token)
      .then(() => cache.put(id, token, time))
      .catch(console.log)
  }

  const removeFromCache = (id) => {
    return onDelete(id, cache.get(id))
      .then(() => caceh.del(id))
  }

  const strategy = new JWTStrategy(jwtOptions, (jwt_payload, cb) => {
    console.log('payload received: ', jwt_payload)
    db.getUserIfExists(jwt_payload.username, (err, user) => {
      console.log('[cache] add *' + user.id + '*: ' + cache.get(user.id).substring(0, 96))
      const checkCache = false
      cb(null, user && (checkCache ? cache.get(user.id) !== null : true) ? user : false, { message: cache.get(user.id) === null ? 'token expired' : 'user not found' })
    })
  })

  const login = (username, password, cb) =>
    db.authenticateUserIfExists(username, password, null, (err, user) => {
      console.log('[auth/login]', err, { id: user.id, username: user.username })
      if(user) {
        const payload = { id: user.id, username: user.username, iss: 'accounts.jannik.ml', partial_key: false, enabled_2fa: user['2fa_enabled'] === 1 ? true : false }
        const token = jwt.sign(payload, jwtOptions.privateKey, { algorithm: jwtOptions.algorithm})
        console.log('[cache] add *' + user.id + '*: ' + token.substring(0, 96))
        addToCache(user.id, token, 30 * 60 * 1000)
        .then(() => cb(err, token))
      } else {
        cb(err, false)
      }
    })

  const Logout = (id, cb) => removeFromCache(id).then(cb)

  return {
    JWTStrategy: strategy,
    Login: login,
    Logout: Logout,
  }
}

module.exports = auth