import type { Request, Response } from 'express'
import type { Strategy } from '../../types/strategy'
import type { Adapters } from '../../types/adapter'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { full_user_to_user, user_to_serialized_user, mfa_challenge } from '../../types/user'
import { check_permission } from '../../util/check_permission'
import { success, failure } from '../../util/response'

import FEATURES from '../../features'

const change_password_request = D.struct({
  new_password: D.string,
  mfa_challenge: D.nullable(mfa_challenge),
})

type ChangePasswordRequest = D.TypeOf<typeof change_password_request>

const change_password = (strategy: Strategy, db: Adapters) => (req: Request, res: Response) => {

  const result = change_password_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid JSON body structure. The following was reported:\n' + D.draw(result.left))
  }

  if(check_permission(req.user, 'auth.user', 'change-password')) {
    return failure(res, 'insufficient permissions, \'auth.user:change-password\' is required')
  }

  const body = req.body as ChangePasswordRequest

  db.user.get_user('id', req.user.id)
    .then(db_user => {

      if(db_user.mfa && !FEATURES.DISABLE_MFA) {
        if(body.mfa_challenge === null) {
          return failure(res, 'failed to change password: mfa error (need to provide mfa challenge)')
        }

        if(db_user.mfa_secret === null) {
          return failure(res, 'failed to change password: mfa error (unexpected state)')
        }

        if(!strategy.mfa_verify(db_user.mfa_secret, body.mfa_challenge)) {
          return failure(res, 'failed to change password: mfa error (challenge failure)')
        }
      }

      db.user.update_user(db_user.id, {
        password: body.new_password
      })
        .then(user => success(res, 'successfully changed password', user_to_serialized_user(full_user_to_user(user))))
        .catch(err => failure(res, 'failed to change password: ' + err.message))

    })
    .catch(err => failure(res, 'something went wrong, the following was reported: ' + err.message))
}

export {
  change_password
}
