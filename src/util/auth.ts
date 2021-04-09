import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import Optional from './Optional'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'

import type { Adapters } from '../types/adapter'
import type { NextFunction, Request, Response } from 'express'
import type { Config } from '../types/config'
import type { Strategy } from '../types/strategy'
import type { User, SerializedUser } from '../types/user'
import { serialized_user, full_user_to_user } from '../types/user'
import type { JWTPayload } from '../types/JWT'
import { jwt_payload } from '../types/JWT'

const hash_password = (password: string, salt: string): string => {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  hash.update(salt)
  return hash.digest('hex')
}

const unauthorized = (res: Response, msg?: string, include_message = true) => res.status(401).end('Unauthorized' + (include_message && msg ? ': ' + msg : ''))

const jwt_strategy = (config: Config): Strategy => {

  const jwt_options = {
    private_key: config.private_key,
    public_key: config.public_key,
    algorithm: 'ES256' as const,
    expires_in: 30*60, // 30 minutes
    refresh_expires_in: 7*24*60*60, // 1 week
    iss: config.jwt.iss,
    aud: config.jwt.aud,
  }

  const extract_token = (req: Request): Optional<string> => {
    const bearer = req.headers['authorization']

    if(!bearer)                      return Optional.reject<string>(new Error('Bearer token not supplied'))
    if(typeof bearer !== 'string')   return Optional.reject<string>(new Error('Bearer token is not a string'))
    if(!bearer.startsWith('Bearer')) return Optional.reject<string>(new Error('Bearer token has invalid prefix'))

    const token = bearer.substring('Bearer '.length)

    return Optional.resolve(token)
  }

  const verify_token = (req: Request, token: string) => new Promise<{ decoded: JWTPayload<{ user: SerializedUser }>, jwt: string }>((resolve, reject) => {
    jwt.verify(token, jwt_options.public_key, (err, decoded) => {
      // TODO: check if the user actually exists
      // TODO: check that the jwt isn't expired yet
      if(err) reject(err)
      else resolve({ decoded: decoded as JWTPayload<{ user: SerializedUser }>, jwt: token })
    })
  })

  const authenticated = (req: Request, res: Response, next: NextFunction) => {
    extract_token(req)
      .then(token => verify_token(req, token))
      .observe_catch(err => unauthorized(res, err.message, config.env === 'dev'))
      .then(promise => promise
        .then(({ jwt, decoded }) => {

          const result = jwt_payload(D.struct({ user: serialized_user }))('access-token').decode(decoded)

          if(isLeft(result)) {
            return unauthorized(res, 'Invalid JWT structure, the following was reported:\n' + D.draw(result.left))
          }

          const parsed_user: User = {
            ...decoded.user,
            creation_date: new Date(decoded.user.creation_date),
            modification_date: new Date(decoded.user.modification_date)
          }

          req.jwt = jwt
          req.user = parsed_user
          console.log('jwt payload', decoded)
          next()
        })
        .catch(err => unauthorized(res, err.message, config.env === 'dev'))
      )
  }

  const generate = (type: 'access-token' | 'refresh-token', user: User, jti: string) => {

    // const jti = 'idk' // TODO: this should be something unique per jwt; this can then be used with a bloom filter potentially
    const sub = 'TODO'   // TODO: what should this be?

    const expire_at = type === 'access-token' ? jwt_options.expires_in : type === 'refresh-token' ? jwt_options.refresh_expires_in : 0

    return jwt.sign({
      user: user,
      type: type
    }, jwt_options.private_key, {
      algorithm: jwt_options.algorithm,
      expiresIn: expire_at,
      issuer: jwt_options.iss,
      audience: jwt_options.aud,
      subject: sub,
      jwtid: jti
    })
  }

  const login = (db: Adapters, username: string, password: string, is_refresh_token = false, get_refresh_token = false) => new Promise<{ user: User, access_token: string, refresh_token?: string }>((resolve, reject) => {
    console.log('login', username, password, is_refresh_token, get_refresh_token)

    if(is_refresh_token) {
      db.user.get_user('username', username)
        .then(user => {
          if(user.disabled) return reject(new Error('user is disabled'))
          // TODO: validate refresh token
          if(user.temp_account !== 0 && user.temp_account < Date.now()) return reject(new Error('temporary account expired'))
          // check mfa (not needed; refresh token bypasses mfa (does it really?; should this maybe only work with a specific device id?))

          console.log('checking the following account', user)
          reject(new Error('not implemented yet LUL'))

        })
        .then(console.log)
        .then(() => reject(new Error('not implemented yet LUL')))
        .catch(() => reject(new Error('user doesn\'t exist or invalid password')))
    } else {
      db.user.get_user('username', username)
        .then(db_user => {
          console.log(hash_password(password, db_user.salt))
          if(db_user.disabled) return reject(new Error('user is disabled'))
          if(db_user.password !== hash_password(password, db_user.salt)) return reject(new Error('user doesn\'t exist or invalid password'))
          if(db_user.temp_account !== 0 && db_user.temp_account < Date.now()) return reject(new Error('temporary account expired'))

          if(db_user.mfa) {
            console.log('need to do something with mfa now')
            return reject(new Error('not implemented yet LUL'))
          } else {
            const user = full_user_to_user(db_user)
            const access_token = generate('access-token', user, 'TODO')
            const refresh_token = get_refresh_token ? generate('refresh-token', user, 'TODO') : undefined

            // TODO: should take note somehow that this user is now logged in
            // TODO: this is a useful and absolutely needed piece of information for the bloom filter feature
            // TODO: should also log it to the console or something like this

            return resolve({
              user: user,
              access_token: access_token,
              refresh_token: refresh_token
            })
          }
          // check mfa
        })
        .catch(() => reject(new Error('user doesn\'t exist or invalid password')))
    }

    // TODO: implement this and call resolve({ user: user, access_token: ..., refresh_token: ... }) or reject(new Error('...'))
  })

  const logout = (username: string) => new Promise<undefined>((resolve, reject) => {
    console.log('logout', username)
    reject(new Error('not implemented yet LUL'))
    // TODO: implement this and call resolve(undefined) or reject(new Error('logout failed')) (message might change)
  })

  return {
    authenticated: authenticated,
    generate: generate,
    login: login,
    logout: logout
  }
}

export default jwt_strategy
