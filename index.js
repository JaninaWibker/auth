const config = require('dotenv').config().parsed
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const passport = require('passport')
const fs = require('fs')
const format_date = require('./utils/format_date.js')
global.format_date = format_date
const cors = require('./utils/cors.js')
const users = require('./users/index.js')
const registertokens = require('./registertokens/index.js')
const services = require('./services/index.js')
const { version } = require('./package.json')

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

passport.use(JWTStrategy)

app.use(express.static('public', { index: 'index.html', extensions: ['html'] }))
app.use(cors)
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(passport.initialize())

app.get('/current-version', (_, res) => res.send(version))

app.post(['/register', '/service/register'], services.register(validateService, public_key))

app.get(['/public_key', '/service/public_key'], services.public_key(public_key))

app.get(['/by-id/:id?', '/service/by-id/:id?'], services.get('by-id'))
app.get(['/by-name/:id?', '/service/by-name/:id?'], services.get('by-name'))
app.get(['/by-app/:id?', '/service/by-app/:id?'], services.get('by-app'))
app.get(['/by-cb/:id?', '/service/by-cb/:id?'], services.get('by-cb'))

app.post('/generate-register-token', passport.authenticate('jwt', { session: false }), registertokens.generate(generateRegisterToken))

app.post('/validate-register-token', passport.authenticate('jwt', { session: false }), registertokens.validate(validateRegisterToken))

app.post('/invalidate-register-token', passport.authenticate('jwt', { session: false }), registertokens.invalidate(validateRegisterToken))

app.post(['/login', '/users/login'], users.login(Login))

app.post(['/logout', '/users/logout'], passport.authenticate('jwt', { session: false }), users.logout(Logout))

app.post(['/add', '/users/add'], users.add({ registerTokenCache: registertokens.registerTokenCache, validateRegisterToken, signJwtNoCheck, generateRefreshToken, manualAddToCache }))

app.post(['admin/add', '/users/admin/add'], passport.authenticate('jwt', { session: false }), users.adminAdd)

app.post(['/modify', '/users/modify'], passport.authenticate('jwt', { session: false }), users.modify(Logout))

app.post(['/modify-self', '/users/modify-self'], passport.authenticate('jwt', { session: false }), users.modifySelf(Logout))

app.post(['/delete', '/users/delete'], passport.authenticate('jwt', { session: false }), users.delete)

app.post(['/test', '/users/test'], passport.authenticate('jwt', { session: false }), users.test)

app.post(['/info', '/users/info'], passport.authenticate('jwt', { session: false }), users.info)

app.post(['/list', '/users/list'], passport.authenticate('jwt', { session: false }), users.list)

app.listen(config.PORT || 3003, () => console.log('HTTP server listening on port ' + (config.PORT || 3003)))
