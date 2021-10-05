// * dependencies
import fs from 'fs'
import dotenv from 'dotenv'
import express, { Request } from 'express'
import morgan from 'morgan'

// * own files
import cors from './util/cors'

import userRouter       from './routers/user/index'
import groupRouter      from './routers/group/index'
import roleRouter       from './routers/role/index'
import permissionRouter from './routers/permission/index'
import deviceRouter     from './routers/device/index'
import configRouter     from './routers/config/index'
import transform from './util/transform-config'
import type { Environment } from './util/transform-config'
import jwt_strategy from './util/auth'
import adapters from './adapters/adapter'

import FEATURES from './features'

dotenv.config()

// npm exposes values from the package.json file as environment variables
const version = process.env.npm_package_version
const startup_time = +new Date()
const partial_config = transform(process.env as Environment)

const public_key = fs.readFileSync(partial_config.cert_files.public_key, 'utf8')
const private_key = fs.readFileSync(partial_config.cert_files.private_key, 'utf8')

const config = Object.assign(partial_config, { public_key: public_key, private_key: private_key })

console.log('Starting the server with the following configuration:')
if(config.env === 'dev') {
  console.log(config)
} else {
  console.log(Object.assign({}, config, { public_key: '<omitted>', private_key: '<omitted>', db: { ...config.db, password: '<omitted>' } }))
}

const app = express()

morgan.token('user',    (req: Request) => req.user && req.user.username)
morgan.token('user_id', (req: Request) => req.user && req.user.id)
morgan.token('jwt',     (req: Request) => req.jwt)

const morgan_skip = (req: Request) => {
  if(req.method === 'OPTIONS') return true
  if(req.url.match(/(js|jpg|png|ico|css|woff|woff2|eot)$/ig)) return true
  // TODO: maybe ignore more things in the future; maybe use allow list instead of block list?
  return false
}

if(config.env == 'dev') {
  app.use(morgan(':method\t:url :status - :user -\t:response-time ms', { skip: morgan_skip }))
} else {
  app.use(morgan(':method\t:url :status -\t:response-time ms', { skip: morgan_skip }))
}

// trust reverse proxy to proxy correct ip addresses
app.set('trust proxy', 'uniquelocal')

app.use(cors)
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.get('/current-version', (_, res) => res.status(200).end(version))
app.get('/uptime',          (_, res) => res.status(200).end(startup_time.toString()))
app.get('/public-key',      (_, res) => res.status(200).end(public_key))

if(!FEATURES.DISABLE_WEBINTERFACE) {
  app.use('/dashboard', express.static('static'))
}

const strategy = jwt_strategy(config)

adapters(config)
  .then(db => {

    // * sub routers
    app.use('/user',       userRouter(strategy, db))
    app.use('/group',      groupRouter(strategy, db))
    app.use('/role',       roleRouter(strategy, db))
    app.use('/permission', permissionRouter(strategy, db))
    app.use('/device',     deviceRouter(strategy, db))
    app.use('/config',     configRouter(strategy, db))

    app.listen(config.port, () => console.log('HTTP server listening on port ' + config.port))
  })
  .catch(err => console.log('couldn\'t start the server', err))
