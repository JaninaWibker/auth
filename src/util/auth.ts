import jwt from 'jsonwebtoken'
import Optional from './Optional'
import type { NextFunction, Request, Response } from 'express'
import type { Config } from '../types/config'
import type { Strategy } from '../types/strategy'
import type { User } from '../types/user'
import { JWTPayload } from '../types/JWT'

const unauthorized = (res: Response, msg?: string) => res.status(401).end('Unauthorized' + (msg ? ': ' + msg : ''))

const jwt_strategy = (config: Config): Strategy => {

  const jwt_options = {
    private_key: config.private_key,
    public_key: config.public_key,
    algorithm: 'ES256' as const,
    expires_in: 30*60,
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

  const verify_token = (req: Request, token: string) => new Promise<{ decoded: JWTPayload<{ user: User }>, jwt: string }>((resolve, reject) => {
    jwt.verify(token, jwt_options.public_key, (err, decoded) => {
      // TODO: check if the user actually exists
      // TODO: check that the jwt isn't expired yet
      if(err) reject(err)
      else resolve({ decoded: decoded as JWTPayload<{ user: User }>, jwt: token })
    })
  })

  const authenticated = (req: Request, res: Response, next: NextFunction) => {
    extract_token(req)
      .then(token => verify_token(req, token))
      .observe_catch(err => unauthorized(res, config.env === 'dev' ? err.message : undefined))
      .then(promise => promise
        .then(({ jwt, decoded }) => {
          req.jwt = jwt
          console.log(jwt, decoded)
          next()
        })
        .catch(err => unauthorized(res, config.env === 'dev' ? err : undefined))
      )
  }

  const generate = (user: User, jti: string) => {

    // const jti = 'idk' // TODO: this should be something unique per jwt; this can then be used with a bloom filter potentially
    const sub = 'TODO'   // TODO: what should this be?

    return jwt.sign({
      user: user
    }, jwt_options.private_key, {
      algorithm: jwt_options.algorithm,
      expiresIn: jwt_options.expires_in,
      issuer: jwt_options.iss,
      audience: jwt_options.aud,
      subject: sub,
      jwtid: jti
    })
  }

  const login = (username: string, password: string, is_refresh_token = false, get_refresh_token = false) => new Promise<{ user: User, access_token: string, refresh_token?: string }>((resolve, reject) => {
    console.log('login', username, password, is_refresh_token, get_refresh_token)
    reject(new Error('not implemented yet LUL'))
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
