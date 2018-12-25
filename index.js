const express = require('express')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const passport = require('passport')
const fs = require('fs')
const db = require('./db.js')
const { fetchTimeout } = require('./utils/fetch.js')
const cors = require('./utils/cors.js')
const users = require('./users/index.js')
const registertokens = require('./registertokens/index.js')
const _cache = require('memory-cache')
const { version } = require('./package.json')

const serviceCache = new _cache.Cache()
const registerTokenCache = new _cache.Cache()

const config = require('dotenv').config().parsed
const default_services = require('./default_services.json')
const private_key = fs.readFileSync('private.key', 'utf8')
const public_key = fs.readFileSync('public.key', 'utf8')

const ldap = config.ENABLE_LDAP === 'true' ? require('./ldap/index.js') : null

if(config.ENABLE_LDAP === 'true') {
  ldap.listen(parseInt(config.LDAP_PORT, 10), (url) => console.log('LDAP server listening at ' + url))
}

const format_date = (date=new Date()) => 
  date.toLocaleDateString().replace(/\//g, '-') + '@' + date.toLocaleTimeString()

const { 
  JWTStrategy,
  Login,
  Logout,
  signJwtNoCheck,
  manualAddToCache,
  validateRegisterToken,
  generateRegisterToken,
  validateService
} = require('./auth.js')({
  private_key: private_key, 
  public_key: public_key, 
  secret: config.SECRET.toString(),
  onAdd: (id, token, payload) => onAdd(id, token, payload), 
  onDelete: (id) => onDelete(id)
})

const account_types = ['default', 'privileged', 'admin']

default_services.forEach(service => serviceCache.put(service.id, service))

let registerTokenCacheIndex = 0

const onAdd = (id, token, payload) =>
  Promise.all(serviceCache.keys()
    .map(key => serviceCache.get(key))
    .map(json => (console.log('[' + format_date() + '][onAdd]', {name: json.name, account_type: json.account_type}, {id: payload.id, account_type: payload.account_type}), json))
    .filter(json => (payload && json.account_type ? account_types.indexOf(payload.account_type) >= account_types.indexOf(json.account_type) : true))
    .map(json => (console.log('[' + format_date() + '][onAdd]', {name: json.name, account_type: json.account_type}, {id: payload.id, account_type: payload.account_type}, account_types.indexOf(payload.account_type), account_types.indexOf(json.account_type)), json))
    .map(json => fetchTimeout(json.url + '/login', 'POST', { id: id, token: token }, { Authorization: 'Bearer ' + jwt.sign({ id: id, isAuthProvider: true }, private_key, { algorithm: 'RS256' }) })
      .then(res => res.status === 401 ? res.text() : res.json())
      .catch(err => (console.log('[' + format_date() + '][onAdd] server not responding (' + json.name + ')'), err))
      .then(text_or_json => console.log('[' + format_date() + '][fetch]', text_or_json))
    )
  )

const onDelete = (id, token, payload) =>
  Promise.all(serviceCache.keys()
    .map(key => serviceCache.get(key))
    .filter(json => (payload && json.account_type ? account_types.indexOf(payload.account_type) >= account_types.indexOf(json.account_type) : true))
    .map(json => (console.log(json), json))
    .map(json => fetchTimeout(json.url + '/logout', 'POST', { id: id, token: token }, { Authorization: 'Bearer ' + jwt.sign({ id: id, isAuthProvider: true }, private_key, { algorithm: 'RS256' }) })
      .then(res => res.status === 401 ? res.text() : res.json())
      .catch(({ message }) => ({ message }))
      .then(text_or_json => console.log('[' + format_date() + '][fetch]', text_or_json))
    )
  )

const app = express()

passport.use(JWTStrategy)

app.use(express.static('public', { index: 'index.html', extensions: ['html'] }))
app.use(cors)
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(passport.initialize())

app.get('/', (_, res) => res.send('server is up and running'))

app.get('/current-version', (_, res) => res.send(version))

app.post(['/register', '/service/register'], (req, res) => {
  console.log('[' + format_date() + '][service/register] "' + req.body.data.name + '" trying to register...')
  if(validateService(Buffer.from(req.get('Authorization').substr('Bearer '.length), 'base64'), {...req.body.data, timestamp: req.body.timestamp})) {
    if(serviceCache.keys().includes(req.body.data.name)) {
      console.log('[' + format_date() + '][service/register] "' + req.body.data.name + '" was already a known service')
      res.json({ message: 'already registered', public_key: public_key })
    } else {
      serviceCache.put(req.body.data.name, req.body.data)
      console.log('[' + format_date() + '][service/register] "' + req.body.data.name + '" registered successfully')
      res.json({ message: 'registration successful', public_key: public_key })
    }
  } else {
    console.log(
      '[' + format_date() + '][service/register] "' + req.body.data.name + '" failed to register...\nvalidation failed, investigation may be required', 
      'BODY', {...req.body.data, timestamp: req.body.timestamp, }, 
      'HEADER', req.get('Authorization')
    )
    res.json({ message: 'registration failed', public_key: public_key })
  }
})

app.get(['/public_key', '/service/public_key'], (req, res) => res.send(public_key))

app.get(['/:method/:id?', '/service/:method/:id?'], (req, res) => {

  if(!req.params.id) res.json({ message: 'supply id/name/app/cb (/service/:method/:id)' })

  const find_match = (field) => serviceCache.keys()
    .map(key => serviceCache.get(key))
    .filter(service => service[field] === req.params.id)[0]

       if(req.params.method === 'by-id')   res.json(find_match('id')   || ({ message: 'service not found' }))
  else if(req.params.method === 'by-name') res.json(find_match('name') || ({ message: 'service not found' }))
  else if(req.params.method === 'by-app')  res.json(find_match('app')  || ({ message: 'service not found' }))
  else if(req.params.method === 'by-cb')   res.json(find_match('url')  || ({ message: 'service not found' }))
  else                                     res.json({ message: 'supply method and id/name/app/cb' })

})

app.post('/generate-register-token', passport.authenticate('jwt', { session: false }), (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) res.status(500).json({ message: 'failed to validate user'})
    if(user.account_type === 'admin') {
      const permanent = req.body.permanent !== undefined ? req.body.permanent : false
      const register_token = generateRegisterToken({
        id: registerTokenCacheIndex,
        timestamp: Date.now(),
        ...req.body,
        permanent: permanent,
        expireAt: permanent ? 0 : (req.body.expireAt || 30 * 60 * 1000),
      })

      registerTokenCache.put(registerTokenCacheIndex, register_token)

      res.json({ register_token: register_token, id: registerTokenCacheIndex++ })

    } else {
      res.status(403).json({ message: 'account not permitted' })
    }
  })
})

app.post('/validate-register-token', passport.authenticate('jwt', { session: false }), registertokens.validate(validateRegisterToken))

app.post('/invalidate-register-token', passport.authenticate('jwt', { session: false }), registertokens.invalidate(validateRegisterToken, registerTokenCache))

app.post(['/login', '/users/login'], users.login(Login))

app.post(['/logout', '/users/logout'], passport.authenticate('jwt', { session: false }), users.logout(Logout))

app.post(['/add', '/users/add'], (req, res) => {
  const data = req.body
  if(data.username && data.password && data.first_name && data.last_name && data.email) {

    let account_type = 'default'
    let registerTokenStatus
    let metadata
    
    if(data.register_token) {
      const registerTokenData = validateRegisterToken(data.register_token)
      if(registerTokenCache.get(registerTokenData.id) !== null) {
        account_type = registerTokenData.account_type || 'default'
        metadata = registerTokenData.metadata || {}
        registerTokenStatus = 'register token used successfully'
        serviceCache.del(registerTokenData.id)
      } else {
        registerTokenStatus = "supplied register token was not valid, could not be used"
      }
    }

    db.addUser(data.username, data.password, data.first_name, data.last_name, data.email, account_type, metadata, (err, row) => {
      if(err) {
        res.json({ message: err })
      } else {
        console.log('userAdd row', row, row.lastID)
        const payload = { id: row.lastID, username: data.username, iss: 'accounts.jannik.ml', account_type: account_type, '2fa_enabled': row['2fa_enabled'] }
        const token = signJwtNoCheck(payload)
        console.log('userAdd', payload, token)
        manualAddToCache(row.lastID, token, payload, 30 * 60 * 1000)
          .then(() =>
            res.json({
              message: 'account creation successful',
              token: token,
              ...(registerTokenStatus ? {registerTokenStatus: registerTokenStatus} : {})
            })
          )
      }
    })
  } else {
    res.json({ message: 'supply "username", "password", "first_name", "last_name" and "email"' })
  }
})

app.post(['/modify', '/users/modify'], passport.authenticate('jwt', { session: false }), users.modify(Logout))

app.post(['/modify-self', '/users/modify-self'], passport.authenticate('jwt', { session: false }), users.modifySelf(Logout))

app.post(['/delete', '/users/delete'], passport.authenticate('jwt', { session: false }), users.delete)

app.post(['/test', '/users/test'], passport.authenticate('jwt', { session: false }), users.test)

app.post(['/info', '/users/info'], passport.authenticate('jwt', { session: false }), users.info)

app.post(['/list', '/users/list'], passport.authenticate('jwt', { session: false }), users.list)

app.listen(config.PORT || 3003, () => console.log('HTTP server listening on port ' + (config.PORT || 3003)))
