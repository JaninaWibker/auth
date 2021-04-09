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
    get_refresh_token: D.boolean
  }),
  D.struct({
    username: D.string,
    refresh_token: D.string,
    is_refresh_token: D.literal(true),
    get_refresh_token: D.literal(false)
  })
)

type LoginRequest = D.TypeOf<typeof login_request>

const login = (db: Adapters, strategy: Strategy) => (req: Request, res: Response) => {
  const result = login_request.decode(req.body)
  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  const body = req.body as LoginRequest

  const login_promise = body.is_refresh_token
    ? strategy.login(db, body.username, body.refresh_token, true, body.get_refresh_token)
    : strategy.login(db, body.username, body.password, false, body.get_refresh_token)

  login_promise
    .then(({ user, access_token, refresh_token }) =>
      success(res, 'successfully logged in', body.get_refresh_token ? { user, access_token, refresh_token } : { user, access_token })
    )
    .catch((err: Error) => failure(res, 'failed to log in: ' + err.message))
}

export {
  login
}
