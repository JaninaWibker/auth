const express = require('express')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const passport = require('passport')
const config = require('dotenv').config().parsed
const fs = require('fs')
const db = require('./db.js')
const _cache = require('memory-cache')
const cache = new _cache.Cache()
const registerTokenCache = new _cache.Cache()
const default_services = require('./default_services.json')
const private_key = fs.readFileSync('private.key', 'utf8')
const public_key = fs.readFileSync('public.key', 'utf8')
const { JWTStrategy, Login, Logout, signJwtNoCheck, manualAddToCache, validateRegisterToken, generateRegisterToken } = require('./auth.js')(private_key, public_key, (id, token, payload) => onAdd(id, token, payload), (id) => onDelete(id))

const users = require('./users/index.js')
const registertokens = require('./registertokens/index.js')

const { fetchTimeout } = require('./utils/fetch.js')
const cors = require('./utils/cors.js')

const account_types = ['default', 'privileged', 'admin']

let registerTokenCacheIndex = 0

const onAdd = (id, token, payload) =>
  Promise.all(cache.keys()
    .map(key => cache.get(key))
    .map(json => (console.log('[onAdd]', {name: json.name, account_type: json.account_type}, {id: payload.id, account_type: payload.account_type}), json))
    .filter(json => (payload && json.account_type ? account_types.indexOf(payload.account_type) >= account_types.indexOf(json.account_type) : true))
    .map(json => (console.log('[onAdd]', {name: json.name, account_type: json.account_type}, {id: payload.id, account_type: payload.account_type}, account_types.indexOf(payload.account_type), account_types.indexOf(json.account_type)), json))
    .map(json => fetchTimeout(json.url + '/login', 'POST', { id: id, token: token }, { Authorization: 'Bearer ' + jwt.sign({ id: id, isAuthProvider: true }, private_key, { algorithm: 'RS256' }) })
      .then(res => res.status === 401 ? res.text() : res.json())
      .catch(err => (console.log('[onAdd] server not responding (' + json.name + ')'), err))
      .then(text_or_json => console.log('[fetch]', text_or_json))
    )
  )

const onDelete = (id, token, payload) =>
  Promise.all(cache.keys()
    .map(key => cache.get(key))
    .filter(json => (payload && json.account_type ? account_types.indexOf(payload.account_type) >= account_types.indexOf(json.account_type) : true))
    .map(json => (console.log(json), json))
    .map(json => fetchTimeout(json.url + '/logout', 'POST', { id: id, token: token }, { Authorization: 'Bearer ' + jwt.sign({ id: id, isAuthProvider: true }, private_key, { algorithm: 'RS256' }) })
      .then(res => res.status === 401 ? res.text() : res.json())
      .catch(({ message }) => ({ message }))
      .then(text_or_json => console.log('[fetch]', text_or_json))
    )
  )

const app = express()

default_services.forEach(service => cache.put(service.id, service))

passport.use(JWTStrategy)

app.use(express.static('public', { index: 'index.html', extensions: ['html'] }))
app.use(cors)
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(passport.initialize())

app.get('/', (req, res) => res.send('server is up and running'))

app.post(['/register', '/service/register'], (req, res) => {
  console.log(req.get('Authorization').substr('Bearer '.length), Buffer.from(config.SECRET.toString(), 'binary').toString('base64'))
  if(req.get('Authorization').substr('Bearer '.length) === Buffer.from(config.SECRET.toString(), 'binary').toString('base64') && cache.get(req.body.data.name) !== undefined) {
    if(cache.keys().includes(req.body.data.name)) {
      res.json({ message: 'already registered', public_key: public_key })
    } else {
      cache.put(req.body.data.name, req.body.data)
      res.json({ message: 'registration successful', public_key: public_key })
    }
  } else {
    res.json({ message: 'registration failed', public_key: public_key })
  }
})

app.get(['/public_key', '/service/public_key'], (req, res) => res.send(public_key))

app.get(['/:method/:id?', '/service/:method/:id?'], (req, res) => {

  if(!req.params.id) res.json({ message: 'supply id/name/app/cb (/service/:method/:id)' })

  const find_match = (field) => cache.keys()
    .map(key => cache.get(key))
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
        cache.del(registerTokenData.id)
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

app.listen(config.PORT || 3003, () => console.log('server started on port ' + (config.PORT || 3003)))
