import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import type { Config } from '../types/config'
import type { Strategy } from '../types/strategy'

const unauthorized = (res: Response) => res.status(401).end('Unauthorized')

const jwt_strategy = (config: Config): Strategy => {

  const jwtOptions = {
    private_key: config.private_key,
    public_key: config.public_key,
    algorithm: 'ES256' as const,
    expires_in: 30*60,
    iss: config.jwt.iss,
    aud: config.jwt.aud,
  }

  const authenticated = (req: Request, res: Response, next: NextFunction) => {

    const bearer = req.headers['authorization']

    if(!bearer) return unauthorized(res)
    if(typeof bearer !== 'string') return unauthorized(res)

    const token = bearer.substring('Bearer '.length)

    console.log(token)

    req.jwt = token

    jwt.verify(token, jwtOptions.public_key, (err, decoded) => {
      console.log(err, decoded)
    })

    next()
  }

  const generate = () => {

    const jti = 'idk' // TODO: this should be something unique per jwt; this can then be used with a bloom filter potentially
    const sub = 'TODO' // TODO: what should this be?

    return jwt.sign({
      // TODO: what goes into the
    }, jwtOptions.private_key, {
      algorithm: jwtOptions.algorithm,
      expiresIn: jwtOptions.expires_in,
      issuer: jwtOptions.iss,
      audience: jwtOptions.aud,
      subject: sub,
      jwtid: jti
    })
  }

  return {
    authenticated: authenticated,
    generate: generate
  }
}

export default jwt_strategy
