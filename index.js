const express = require('express')
const bodyParser = require('body-parser')
const passport = require('passport')
const fs = require('fs')
const cors = require('./utils/cors.js')
const users = require('./users/index.js')
const registertokens = require('./registertokens/index.js')
const services = require('./services/index.js')
const { version } = require('./package.json')

const config = require('dotenv').config().parsed
const private_key = fs.readFileSync('private.key', 'utf8')
const public_key = fs.readFileSync('public.key', 'utf8')

const ldap = config.ENABLE_LDAP === 'true' ? require('./ldap/index.js') : null

if(config.ENABLE_LDAP === 'true') {
  ldap.listen(parseInt(config.LDAP_PORT, 10), (url) => console.log('LDAP server listening at ' + url))
}

const {
  JWTStrategy,
  Login,
  Logout,
  signJwtNoCheck,
  manualAddToCache,
  generateRefreshToken,
  validateRegisterToken,
  generateRegisterToken
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
app.use(passport.initialize())

app.get('/', (_, res) => res.send('server is up and running'))

app.get('/current-version', (_, res) => res.send(version))

app.post(['/register', '/service/register'], services.register(validateRegisterToken, public_key))

app.get(['/public_key', '/service/public_key'], services.public_key(public_key))

app.get(['/:method/:id?', '/service/:method/:id?'], services.get)

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
