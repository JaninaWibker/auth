import type { Request, Response } from 'express'
import type { Strategy } from '../../types/strategy'
import type { Adapters } from '../../types/adapter'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { failure, success } from '../../util/response'

const login_request = D.union(
  D.struct({
    username: D.string,
    password: D.string,
    is_refresh_token: D.literal(false),
    is_mfa_token: D.literal(false),
    get_refresh_token: D.boolean,
    device_id: D.nullable(D.string),
  }),
  D.struct({
    username: D.string,
    refresh_token: D.string,
    is_refresh_token: D.literal(true),
    is_mfa_token: D.literal(false),
    get_refresh_token: D.literal(false),
    device_id: D.nullable(D.string),
  }),
  D.struct({
    username: D.string,
    mfa_challenge: D.string,
    mfa_token: D.string,
    is_refresh_token: D.literal(false),
    is_mfa_token: D.literal(true),
    get_refresh_token: D.boolean,
    device_id: D.nullable(D.string),
  })
)

type LoginRequest = D.TypeOf<typeof login_request>

const login = (db: Adapters, strategy: Strategy) => (req: Request, res: Response) => {
  const result = login_request.decode(req.body)
  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  const body = req.body as LoginRequest

  const password_like = body.is_refresh_token
    ? body.refresh_token
    : body.is_mfa_token
      ? body.mfa_token
      : body.password

  const state = {
    is_refresh_token: body.is_refresh_token,
    is_mfa_token: body.is_mfa_token,
    get_refresh_token: body.get_refresh_token
  }

  const metadata = {
    device_id: body.device_id ? body.device_id : undefined,
    useragent: req.headers['user-agent'],
    ip: req.ip
  }

  strategy.login(db, body.username, password_like, state, metadata, body.is_mfa_token ? body.mfa_challenge : undefined)
    .then(tokens => {
      if('mfa_token' in tokens) {
        success(res, 'mfa challenge required', { mfa_token: tokens.mfa_token })
      } else if(body.get_refresh_token) {
        success(res, 'successfully logged in', { user: tokens.user, access_token: tokens.access_token, refresh_token: tokens.refresh_token, device_id: tokens.device_id })
      } else {
        success(res, 'successfully logged in', { user: tokens.user, access_token: tokens.access_token, device_id: tokens.device_id })
      }
    })
    .catch((err: Error) => failure(res, 'failed to log in: ' + err.message))
}

export {
  login
}
