import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import Optional from './Optional'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'

import type { Adapters } from '../types/adapter'
import type { NextFunction, Request, Response } from 'express'
import type { Config } from '../types/config'
import type { Strategy } from '../types/strategy'
import type { User } from '../types/user'
import { serialized_user, full_user_to_user, serialized_user_to_user } from '../types/user'
import { JWTPayload, JWTType } from '../types/JWT'
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
    mfa_expires_in: 5*60, // 5 minutes
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

  const verify_token = <T>(decoder: D.Decoder<unknown, T>, token: string) => new Promise<{ decoded: JWTPayload<T>, jwt: string }>((resolve, reject) => {
    jwt.verify(token, jwt_options.public_key, (err, decoded) => {
      if(err) {
        return reject(err)
      }

      const result = jwt_payload(decoder).decode(decoded)

      if(isLeft(result)) {
        return reject(new Error('Invalid JWT structure, the following was reported:\n' + D.draw(result.left)))
      }

      return resolve({ decoded: decoded as JWTPayload<T>, jwt: token })
    })
  })

  const authenticated = (req: Request, res: Response, next: NextFunction) => {
    extract_token(req)
      .then(token => verify_token(D.struct({ user: serialized_user, type: D.literal('access-token') }), token))
      .observe_catch(err => unauthorized(res, err.message, config.env === 'dev'))
      .then(promise => promise
        .then(({ jwt, decoded }) => {

          // TODO: verify that the user really exists

          req.jwt = jwt
          req.user = serialized_user_to_user(decoded.user)
          console.log('jwt payload', decoded)
          next()
        })
        .catch(err => unauthorized(res, err.message, config.env === 'dev'))
      )
  }

  const generate = (type: JWTType, user: User, jti: string, device_id?: string) => {

    // const jti = 'idk' // TODO: this should be something unique per jwt; this can then be used with a bloom filter potentially
    const sub = 'TODO'   // TODO: what should this be?

    const expire_at = type === 'access-token'
      ? jwt_options.expires_in
      : type === 'refresh-token'
        ? jwt_options.refresh_expires_in
        : type === 'mfa-token'
          ? jwt_options.mfa_expires_in
          : 0

    return jwt.sign({
      user: user,
      type: type,
      device_id: device_id
    }, jwt_options.private_key, {
      algorithm: jwt_options.algorithm,
      expiresIn: expire_at,
      issuer: jwt_options.iss,
      audience: jwt_options.aud,
      subject: sub,
      jwtid: jti
    })
  }

  const mfa_generate = () => {
    const secret = speakeasy.generateSecret()
    return {
      base32: secret.base32,
      qrcode: qrcode.toDataURL(secret.otpauth_url as string)
    }
  }

  const mfa_verify = (secret: string, token: string) => {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token
    })
  }

  const login = (db: Adapters, username: string, password_like: string, is_refresh_token = false, is_mfa_token = false, get_refresh_token = false, device_id?: string, mfa_challenge?: string) => new Promise<{ user: User, access_token: string, refresh_token?: string } | { mfa_token: string }>((resolve, reject) => {
    console.log('login', username, password_like, is_refresh_token, is_mfa_token, get_refresh_token, mfa_challenge)

    db.user.get_user('username', username)
      .then(db_user => {
        const user = full_user_to_user(db_user)

        const accept = (user: User, get_refresh_token: boolean) => {

          // TODO: should take note somehow that this user is now logged in
          // TODO: this is a useful and absolutely needed piece of information for the bloom filter feature
          // TODO: should also log it to the console or something like this

          const access_token = generate('access-token', user, 'TODO')
          const refresh_token = get_refresh_token ? generate('refresh-token', user, 'TODO', device_id) : undefined

          return {
            user: user,
            access_token: access_token,
            refresh_token: refresh_token
          }
        }

        // * Some checks need to be done regardless of `is_refresh_token`, some don't:
        // * - [both] checking if user account has been disabled
        // * - [both] checking if user account is only temporary and expired
        // * - [refresh-only] comparing device id with saved one to allow mfa bypass
        // *   when using a refresh token mfa is bypassed if the correct device is being used
        // *   this is to make sure the user doesn't randomly have to re-enter mfa information
        // *   as using a refresh-token is most often than not done automatically by applications.
        // * - [password-only] checking if additional mfa checks need to be done
        // *   the protocol then is to issue a special kind of token which allows you to login
        // *   without providing the username and password again; just this token. This token
        // *   should only be valid for 5 minutes or something of that sort.
        // * - [refresh-only] the refresh token needs to be validated
        // * - [password-only] the password needs to be validated
        // *
        // * Additionally mfa tokens also need to be handled here as well. For this the mfa_challenge
        // * parameter is used as well as the current date and the mfa_token (password_like).

        if(db_user.disabled)                                                return reject(new Error('user account is disabled'))
        if(db_user.temp_account !== 0 && db_user.temp_account < Date.now()) return reject(new Error('temporary account expired'))

        if(is_mfa_token) {
          console.log('mfa: ', password_like, mfa_challenge)

          verify_token(D.struct({ user: serialized_user, device_id: D.string, type: D.literal('mfa-token') }), password_like)
            .then(({ decoded }) => {

              if(decoded.user.username !== username)                        return reject(new Error('provided mfa-token is ment for another user'))
              if(!device_id)                                                return reject(new Error('must provide device_id when using mfa'))
              if(decoded.device_id !== device_id)                           return reject(new Error('mfa_token device_id must equal device_id'))
              if(!mfa_challenge)                                            return reject(new Error('must provide a valid token for mfa challenge'))
              if(!mfa_verify(db_user.mfa_secret as string, mfa_challenge))  return reject(new Error('invalid token for mfa challenge'))

              return resolve(accept(user, get_refresh_token))
            })
            .catch(err => {
              console.warn(err)
              reject(err)
            })
        } else if(is_refresh_token) {
          verify_token(D.struct({ user: serialized_user, device_id: D.string, type: D.literal('refresh-token') }), password_like)
            .then(({ decoded }) => {
              console.log(decoded)

              if(decoded.user.username !== username)  return reject(new Error('provided refresh-token is ment for another user'))
              if(!device_id)                          return reject(new Error('must provide device_id when using refresh_token'))
              if(decoded.device_id !== device_id)     return reject(new Error('refresh_token device_id must equal device_id'))

              // mfa can be safely ignored now because device_id's match and refresh_tokens are generally trusted

              return resolve(accept(serialized_user_to_user(decoded.user), false))
            })
            .catch(err => {
              console.warn(err)
              reject(err)
            })
        } else {
          if(db_user.password !== hash_password(password_like, db_user.salt)) return reject(new Error('user doesn\'t exist or invalid password'))
          if(db_user.mfa) {
            return resolve({
              mfa_token: generate('mfa-token', user, 'TODO', device_id)
            })
          } else {
            return resolve(accept(user, get_refresh_token))
          }
        }
      })
      .catch(() => reject(new Error('user doesn\'t exist or invalid password')))
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
    logout: logout,
    mfa_generate: mfa_generate,
    mfa_verify: mfa_verify
  }
}

export default jwt_strategy
