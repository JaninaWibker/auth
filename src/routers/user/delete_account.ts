import type { Request, Response } from 'express'
import type { Strategy } from '../../types/strategy'
import type { Adapters } from '../../types/adapter'
import { check_permission } from '../../util/check_permission'
import { mfa_challenge } from '../../types/user'
import { success, failure } from '../../util/response'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'

import FEATURES from '../../features'

const delete_account_request = D.struct({
  mfa_challenge: D.nullable(mfa_challenge),
})

type DeleteAccountRequest = D.TypeOf<typeof delete_account_request>

const delete_account = (strategy: Strategy, db: Adapters) => (req: Request, res: Response) => {

  const result = delete_account_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  if(check_permission(req.user, 'auth.user', 'delete-own-account')) {
    return failure(res, 'insufficient permissions, \'auth.user:delete-own-account\' is required')
  }

  const body = req.body as DeleteAccountRequest

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

      // TODO: actually delete the account

      failure(res, 'not implemented yet')
    })
}

export {
  delete_account
}
