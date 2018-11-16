const express = require('express')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const passport = require('passport')
const config = require('dotenv').config().parsed
const fs = require('fs')
const URL = require('url')
const db = require('./db.js')
const _fetch = require('node-fetch')
const _cache = require('memory-cache')
const cache = new _cache.Cache()
const registerTokenCache = new _cache.Cache()
const default_services = require('./default_services.json')
const private_key = fs.readFileSync('private.key', 'utf8')
const public_key = fs.readFileSync('public.key', 'utf8')
const { JWTStrategy, Login, Logout, signJwtNoCheck, validateRegisterToken, generateRegisterToken } = require('./auth.js')(private_key, public_key, (id, token, payload) => onAdd(id, token, payload), (id) => onDelete(id))

const account_types = ['default', 'privileged', 'admin']

let registerTokenCacheIndex = 0

const fetchTimeout = (url, method, body, headers, timeout=50) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Request timed out')), timeout)
  return fetch(url, method, body, headers)
    .then(resolve)
    .catch(reject)
    .finally((x) => (console.log(x), clearTimeout(timer), x))
})

const fetch = (url, method='POST', body, headers) => _fetch(url, {
  body: method === 'POST' ? JSON.stringify(body) : null,
  method: method,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...headers
  }
})

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

const cors = (req, res, next) => {

  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  const url = URL.parse(req.protocol + '://' + req.get('host'))
  const url_reversed_arr = url.hostname.split('.').reverse()

  if((url_reversed_arr[0] === 'ml' && url_reversed_arr[1] === 'jannik') 
  || (url_reversed_arr[0] === 'net' && url_reversed_arr[1] === 'ddns' && url_reversed_arr[2] === 'jannik')
  || (url_reversed_arr[3] === '192' && url_reversed_arr[2] === '168' && url_reversed_arr[1] === '178')
  || (url_reversed_arr[0] === 'jannik-rpi3')
  || (url_reversed_arr[0] === 'jannik-mbp-2017')
  || (url_reversed_arr[0] === 'samba-server')
  || (url_reversed_arr[0] === 'localhost')) {
    res.header('Access-Control-Allow-Origin', req.get('origin'))
  } else {
    console.log('[CORS] Unauthorized Access from ' + req.get('host'))
    res.header('Access-Control-Allow-Origin', '')
  }

  next()
}

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

app.post(['/login', '/users/login'], (req, res) => {
  console.log('[login] ', { password: req.body.password, username: req.body.username })
  if(req.body.username && req.body.password) {
    const username = req.body.username
    const password = req.body.password
    Login(username, password, (err, token) => {
      console.log(err, token)
      if(err || !token) res.status(401).json({ message: 'authentication failed' })
      else res.json({ message: 'authentication successful', token: token })
    })
  } else {
    res.status(401).json({ message: 'supply username and password' })
  }
})

app.post(['/logout', '/users/logout'], passport.authenticate('jwt', { session: false }), (req, res) => {
  Logout(req.user.id, bool => res.json({ message: bool ? 'log out successful' : 'log out failed' }))
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

app.post('/validate-register-token', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json(validateRegisterToken(req.body.register_token))
})

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
      if(err) res.json({ message: err })
      else res.json({
        message: 'account creation successful',
        token: signJwtNoCheck({ id: row.rowid, username: row.username, account_type: row.account_type, '2fa_enabled': row['2fa_enabled'] }),
        ...(registerTokenStatus ? {registerTokenStatus: registerTokenStatus} : {})
      })
    })
  } else {
    res.json({ message: 'supply "username", "password", "first_name", "last_name" and "email"' })
  }
})

app.post(['/modify-self', '/users/modify-self'], passport.authenticate('jwt', { session: false }), (req, res) => {
  if(req.body.id || req.user.id) {

    db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
      if(err) return res.status(500).json(info)
      if(user.account_type === 'admin') db.privilegedModifyUser(req.body.id || req.user.id, req.body, (err, x) => {
          if(err) res.json({ message: 'privileged account modification failed' })
          else Logout(req.body.id || req.user.id, bool => res.json({ message: 'privileged account modification ' + (bool ? 'successful' : 'failed') }))
        })
      else db.modifyUser(req.user.id, req.body, (err, x) => {
          if(err) res.json({ message: 'account modification failed' })
          else Logout(req.user.id, bool => res.json({ message: 'account modification ' + (bool ? 'successful' : 'failed') }))
        })
    })

  } else {
    res.json({ message: 'supply id' })
  }
})

app.post(['/modify', '/users/modify'], passport.authenticate('jwt', { session: false }), (req, res) => {
  if(req.body.id || req.body.username) {

    const cb = (err, user, info) => {
      if(err) return res.status(500).json(info)
      if(user.account_type === 'admin') db.privilegedModifyUser(req.body.id, req.body, (err, x) => {
          if(err) res.status(500).json({ message: 'account modification failed' })
          else Logout(req.body.id, bool => res.json({ message: 'account modification ' + (bool ? 'successful' : 'failed') }))
        })
      else db.modifyUser(req.body.id, req.body, (err, x) => {
          if(err) res.status(500).json({ message: 'account modification failed' })
          else Logout(req.body.id, bool => res.json({ message: 'account modification ' + (bool ? 'successful' : 'failed') }))
        })
    }

    if(req.body.id) db.getUserFromIdIfExists(req.body.id, cb)
    else if(req.body.username) db.getUserIfExists(req.body.username, cb)
  } else {
    res.status(500).json({ message: 'supply username or id' })
  }
})

app.post(['/delete', '/users/delete'], passport.authenticate('jwt', { session: false }), (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return res.status(500).json(info)

    const userIdToBeDeleted = user.account_type ==='admin' && req.body.id !== undefined ? req.body.id : req.user.id 

    db.deleteUser(userIdToBeDeleted, (err, rows_affected) => {
      if(err) res.json({ message: 'account deletion failed' })
      else res.json({ message: 'account deletion successful' })
    })

  })
})

app.post(['/test', '/users/test'], passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ message: 'authenticated', user: req.user })
})

app.post(['/info', '/users/info'], passport.authenticate('jwt', { session: false }), (req, res) => {
  console.log(req.body, req.user)
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(req.body.username === undefined) {
      db.getUserIfExists(req.user.username, (err, user) => {
        res.json({ message: '', user: user })
      })
    }
    else if(req.body.username === req.user.username || user.account_type === 'admin') {
      db.getUserIfExists(req.body.username, (err, user) => {
        res.json({ message: '', user: user })
      })
    } else {
      db.getUserLimitedIfExists(req.body.username, (err, user) => {
        res.json({ message: '', user: user })
      })
    }
  })
})

app.post(['/list', '/users/list'], passport.authenticate('jwt', { session: false }), (req, res) => {
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return res.status(500).json(info)
    if(user.account_type === 'admin') {
      db.getUserList((err, users, info) => {
        if(err || info) res.status(500).json({ message: info.message })
        else res.json({ users })
      })
    } else {
      res.status(403).json({ message: 'account not permitted' })
    }
  })
})

app.listen(config.PORT || 3003, () => console.log('server started on port ' + (config.PORT || 3003)))
