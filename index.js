'use strict';
const config = require('dotenv').config().parsed
const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const passport = require('passport')
const fs = require('fs')
const format_date = require('./utils/format_date.js')
global.format_date = format_date
const cors = require('./utils/cors.js')
const users = require('./users/index.js')
const device = require('./devices/index.js')
const registertokens = require('./registertokens/index.js')
const services = require('./services/index.js')
const { version } = require('./package.json')
const startup_time = +new Date()

const private_key = fs.readFileSync('certs/auth/private.key', 'utf8')
const public_key = fs.readFileSync('certs/auth/public.key', 'utf8')

const ldap = config.ENABLE_LDAP === 'true' ? require('./ldap/index.js') : null

if(config.ENABLE_LDAP === 'true') {
  ldap.listen(parseInt(config.LDAP_PORT, 10), (url) => console.log('LDAP server listening at ' + url))
}

global.atob = str => Buffer.from(str, 'base64').toString('binary')
global.btoa = str => {
  if(str instanceof Buffer)
    return str.toString('base64')
  else
    return Buffer.from(str.toString(), 'binary').toString('base64')
}

const {
  JWTStrategy,
  Login,
  Logout,
  signJwtNoCheck,
  manualAddToCache,
  generateRefreshToken,
  validateRegisterToken,
  generateRegisterToken,
  validateService
} = require('./auth.js')({
  private_key: private_key, 
  public_key: public_key,
  secret: config.SECRET.toString(),
  onAdd: services.onAdd(private_key),
  onDelete: services.onDelete(private_key)
})

const app = express()

app.set('trust proxy', 'uniquelocal') // trust nginx to proxy the correct ip addresses

passport.use(JWTStrategy)

app.use(express.static('frontend/build', { index: 'index.html', extensions: ['html'] }))

// this is placed below express.static since it would otherwise also log every access to static content.
morgan.token('user', req => req.user && req.user.username)
morgan.token('user_id', req => req.user && req.user.id)

if(config.ENV && config.ENV.toLowerCase() === 'dev')
  app.use(morgan(':method\t:url :status -\t:response-time ms', { skip: req => req.method === 'OPTIONS' }))
else
  app.use(morgan(':method\t:url :status - :user -\t:response-time ms', { skip: req => req.method === 'OPTIONS' }))

app.use(cors)
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(passport.initialize())

app.get('/current-version', (_, res) => res.status(200).end(version))

app.get('/uptime', (_, res) => res.status(200).end(startup_time.toString()))

// service endpoint

app.post(['/register', '/service/register'], services.register(validateService, public_key))

app.get(['/public_key', '/service/public_key'], services.public_key(public_key))

app.get(['/by-id/:id?', '/service/by-id/:id?'], services.get('by-id'))
app.get(['/by-name/:id?', '/service/by-name/:id?'], services.get('by-name'))
app.get(['/by-app/:id?', '/service/by-app/:id?'], services.get('by-app'))
app.get(['/by-cb/:id?', '/service/by-cb/:id?'], services.get('by-cb'))

// register-token endpoint

const _passport_mw = passport.authenticate('jwt', { session: false })
const passport_mw = (req, res, next) => _passport_mw(req, res, next)

app.post('/generate-register-token', passport_mw, registertokens.generate(generateRegisterToken))

app.post('/validate-register-token', passport_mw, registertokens.validate(validateRegisterToken))

app.delete('/invalidate-register-token', passport_mw, registertokens.invalidate(validateRegisterToken))

app.get('/list-register-tokens/:extra?', passport_mw, registertokens.list(validateRegisterToken))

// login / logout endpoint

app.post(['/login', '/users/login'], users.login(Login))

app.post(['/logout', '/users/logout'], passport_mw, users.logout(Logout))

// users endpoint

app.post(['/add', '/users/add'], users.add({ registerTokenCache: registertokens.registerTokenCache, validateRegisterToken, signJwtNoCheck, generateRefreshToken, manualAddToCache }))

app.post(['/admin/add', '/users/admin/add'], passport_mw, users.adminAdd)

app.post(['/modify', '/users/modify'],  passport_mw, users.modify(Logout))
app.put(['/users', '/users/modify'],    passport_mw, users.modify(Logout)) // TODO: find out if this should be PATCH or PUT, I feel like it should be patch

app.post(['/modify-self', '/users/modify-self'],  passport_mw, users.modifySelf(Logout))
app.put(['/users/self', '/users/modify-self'],    passport_mw, users.modifySelf(Logout)) // TODO: find out if this should be PATCH or PUT, I feel like it should be patch

app.post(['/delete', '/users/delete'],  passport_mw, users.delete)
app.delete(['/users', '/users/delete'], passport_mw, users.delete)

app.post(['/test', '/users/test'],  passport_mw, users.test)
app.get(['/test', '/users/test'],   passport_mw, users.test)

app.post(['/info', '/users/info'],                    passport_mw, users.info)
app.get(['/info/:username', '/users/info/:username'], passport_mw, users.info)

app.post(['/list', '/users/list'], passport_mw, users.list)
app.get( ['/list', '/users/list'], passport_mw, users.list)

app.get(['/username-already-taken/:username?', '/users/username-already-taken/:username?'], users.username_already_taken)

app.get(['/is-passwordless/:username?', '/users/is-passwordless/:username?'], users.is_passwordless)

app.patch(['/set-password', '/users/set-password'], users.set_password)

app.post(['/verify-password-validity', '/users/verify-password-validity'], passport_mw, users.verify_password_validity)

// device endpoint

app.post(['/device', '/device/add'], passport_mw, device.add)
app.delete(['/device', '/device/delete'], passport_mw, device.delete)
app.patch(['/device', '/device/modify'], passport_mw, device.modify)
app.patch(['/device/revoke'], passport_mw, device.revoke)
app.get(['/device/:device_id', '/device/get/:device_id'], passport_mw, device.get)
app.get(['/device/:user_id/:device_id', '/device/get/:user_id/:device_id'], passport_mw, device.get)
app.get(['/devices/:user_id?', '/devices/get/:user_id?'], passport_mw, device.list)

app.get(['/ip/'], passport_mw, device.iplookup)

app.listen(config.PORT || 3003, () => console.log('HTTP server listening on port ' + (config.PORT || 3003)))
