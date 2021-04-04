import type { Request, Response } from 'express'
import { Strategy } from '../types/strategy'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { failure, success } from '../util/response'

const logout_request = D.struct({
  username: D.string
})

type LogoutRequest = D.TypeOf<typeof logout_request>

const logout = (strategy: Strategy) => (req: Request, res: Response) => {
  const result = logout_request.decode(req.body)
  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  const body = req.body as LogoutRequest

  strategy.logout(body.username)
    .then((idk) => {
      console.log(idk)
      success(res, 'successfully logged out', idk)
    })
    .catch((err: Error) => failure(res, 'failed to log in: ' + err.message))
}

export {
  logout
}
