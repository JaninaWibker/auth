// * dependencies
import fs from 'fs'
import dotenv from 'dotenv'
import express, { Request } from 'express'
import morgan from 'morgan'

// * own files
import cors from './util/cors'

import userRouter       from './user/index'
import groupRouter      from './group/index'
import roleRouter       from './role/index'
import permissionRouter from './permission/index'
import deviceRouter     from './device/index'
import configRouter     from './config/index'
import transform from './util/transform-config'
import type { Environment } from './util/transform-config'
import jwt_strategy from './util/auth'

const private_key = fs.readFileSync('./certs/auth/private.key', 'utf8')
const public_key = fs.readFileSync('./certs/auth/public.key', 'utf8')

// npm exposes values from the package.json file as environment variables
const version = process.env.npm_package_version
const startup_time = +new Date()
const config = transform(dotenv.config().parsed as Environment, private_key, public_key)

console.log('Starting the server with the following configuration:')
console.log(Object.assign({}, config, { public_key: '<omitted>', private_key: '<omitted>' }))

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
app.get('/uptime',          (_, res) => res.status(299).end(startup_time.toString()))

const strategy = jwt_strategy(config)

Promise.all([
  userRouter(strategy, config),
  groupRouter(strategy, config),
  roleRouter(strategy, config),
  permissionRouter(strategy, config),
  deviceRouter(strategy, config),
  configRouter(strategy, config)
])
  .then(([userRouter, groupRouter, roleRouter, permissionRouter, deviceRouter, configRouter]) => {

    // * sub routers
    app.use('/user',       userRouter)
    app.use('/group',      groupRouter)
    app.use('/role',       roleRouter)
    app.use('/permission', permissionRouter)
    app.use('/device',     deviceRouter)
    app.use('/config',     configRouter)

    app.listen(config.port, () => console.log('HTTP server listening on port ' + config.port))
  })
  .catch(err => console.log(
    'couldn\'t start the server', err
  ))
