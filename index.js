const express = require('express')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const passport = require('passport')
const config = require('dotenv').config().parsed
const fs = require('fs')
const db = require('./db.js')
const _fetch = require('node-fetch')
const _cache = require('memory-cache')
const cache = new _cache.Cache()
const default_services = require('./example.default_services.json')
const private_key = fs.readFileSync('private.key', 'utf8')
const public_key = fs.readFileSync('public.key', 'utf8')
const { JWTStrategy, Login, Logout } = require('./auth.js')(private_key, public_key, (id, token) => onAdd(id, token), (id) => onDelete(id))

const fetch = (url, method='POST', body, headers) => _fetch(url, {
  body: method === 'POST' ? JSON.stringify(body) : null,
  method: method,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...headers
  }
})

const onAdd = (id, token) => {
  cache.keys().forEach(key => (
    console.log(key, cache.get(key), cache.get(key).url + '/login'),
    fetch(cache.get(key).url + '/login', 'POST', { id: id, token: token }, { Authorization: 'Bearer ' + jwt.sign({ id: id, isAuthProvider: true }, private_key, { algorithm: 'RS256' }) })
      .then(res => res.status === 401 ? res.text() : res.json())
      .then(text_or_json => console.log('[fetch]', text_or_json))
  ))
}

const onDelete = (id, token) => {
  cache.keys().forEach(key => (
    console.log(key, cache.get(key)), 
    fetch(cache.get(key).url + '/logout', 'POST', { id: id, token: token }, { Authorization: 'Bearer ' + jwt.sign({ id: id, isAuthProvider: true }, private_key, { algorithm: 'RS256' }) })
      .then(res => res.status === 401 ? res.text() : res.json())
      .then(text_or_json => console.log('[fetch]', text_or_json))
  ))
}

const app = express()

const internal = express()

default_services.forEach(service => cache.put(service.name, service))

passport.use(JWTStrategy)

const cors = (req, res, next) => {
  const allowed = ['http://jannik.ddns.net', 'http://jannik.ddns.net:3000', 'http://jannik.ddns.net:9129', 'http://jannik-mbp-2017:3000', 'http://notes.jannik.ml', 'http://dev.jannik.ml', 'http://localhost', 'http://localhost:3000']
  res.header('Access-Control-Allow-Origin', allowed.indexOf(req.get('origin')) !== -1 ? req.get('origin') : '')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  next()
}

app.use(cors)
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(passport.initialize())

internal.use(cors)
internal.use(bodyParser.urlencoded({ extended: true }))
internal.use(bodyParser.json())


internal.get('/', (req, res) => res.send('internal server is up and running'))

internal.post('/register', (req, res) => {
  if(cache.get(req.body.data.name) !== undefined) {
    cache.put(req.body.data.name, req.body.data)
    res.json({ message: 'registration successful', public_key: public_key })
  } else {
    res.json({ message: 'registration failed', public_key: public_key })
  }
})

internal.get('/public_key', (req, res) => res.send(public_key))

app.get('/', (req, res) => res.send('server is up and running'))

app.post('/login', (req, res) => {
  console.log('[login] ', { password: req.body.password, username: req.body.username })
  if(req.body.username && req.body.password) {
    const username = req.body.username
    const password = req.body.password
    Login(username, password, (err, token) => {
      if(err || !token) res.status(401).json({ message: 'authentication failed' })
      else res.json({ message: 'authentication successful', token: token })
    })
  } else {
    res.status(401).json({ message: 'supply username and password' })
  }
})

app.post('/logout', passport.authenticate('jwt', { session: false }), (req, res) => {
  Logout(req.user.id, bool => res.json({ message: bool ? 'log out successful' : 'log out failed' }))
})

app.post('/add', (req, res) => {
  const data = req.body
  if(data.username && data.password && data.first_name && data.last_name && data.email) {
    db.addUser(data.username, data.password, data.first_name, data.last_name, data.email, (err, row) => {
      console.log(err, row) // auto login?
      if(err) res.json({ message: err })
      else res.json({ message: 'account creation successful' }) // is this always true? what about errors? need to check for duplicate usernames in db.addUser
    })
  } else {
    res.json({ message: 'supply "username", "password", "first_name", "last_name" and "email"' })
  }
})

app.post('/modify', passport.authenticate('jwt', { session: false }), (req, res) => {
  if(data.id) {
    db.modifyUser(req.user.id, req.body, (err, x) => {
      if(err) res.json({ message: 'account modification failed' })
      else Logout(req.user.id, bool => res.json({ message: 'account modification ' + (bool ? 'successful' : 'failed') }))
    })
  }
})

app.post('/delete', passport.authenticate('jwt', { session: false }), (req, res) => {
  db.deleteUser(req.user.id, (err, rows_affected) => {
    if(err) res.json({ message: 'account deletion failed' })
    else res.json({ message: 'account deletion successful' })
  })
})

app.post('/test', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ message: 'authenticated', user: req.user })
})

app.post('/info', passport.authenticate('jwt', { session: false }), (req, res) => {
  if(req.body.username === req.user.username) {
    db.getUserIfExists(req.body.username, (err, user) => {
      res.json({ message: '', user: user })
    })
  } else {
    db.getUserLimitedIfExists(req.body.username, (err, user) => {
      res.json({ message: '', user: user })
    })
  }
})

app.listen(config.PORT || 3003, () => console.log('server started on port ' + (config.PORT || 3003)))
internal.listen(config.INTERNAL_SERVER_PORT || 3004, () => console.log('internal server started on port ' + (config.INTERNAL_SERVER_PORT || 3004)))