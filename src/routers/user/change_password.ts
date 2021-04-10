import type { Request, Response } from 'express'
import type { Adapters } from '../../types/adapter'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { check_permission } from '../../util/check_permission'
import { success, failure } from '../../util/response'

const change_password_request = D.struct({
  new_password: D.string
})

type ChangePasswordRequest = D.TypeOf<typeof change_password_request>

const change_password = (db: Adapters) => (req: Request, res: Response) => {

  const result = change_password_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  if(check_permission(req.user, 'auth.user', 'change-password')) {
    return failure(res, 'insufficient permissions, \'auth.user:change-password\' is required')
  }

  // TODO: maybe do some mfa flow stuff

  const body = req.body as ChangePasswordRequest

  failure(res, 'not implemented yet')
}

export {
  change_password
}
