import type { Request, Response } from 'express'
import type { Adapters } from '../../types/adapter'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { check_permission } from '../../util/check_permission'
import { success, failure } from '../../util/response'
import { full_user_to_user } from '../../types/user'

const modify_request = D.struct({
  changes: D.partial({
    fullname: D.nullable(D.string),
    email: D.string,
    password: D.string,
    metadata: D.UnknownRecord,
  })
})

type ModifyRequest = D.TypeOf<typeof modify_request>

const modify = (db: Adapters) => (req: Request, res: Response) => {

  const result = modify_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  const body = req.body as ModifyRequest

  if(!check_permission(req.user, 'auth.user', 'modify-self')) {
    return failure(res, 'insufficient permissions, \'auth.user:modify-self\' is required')
  }

  db.user.update_user(req.user.id, body.changes)
    .then(db_user => success(res, 'successfully modified user', full_user_to_user(db_user)))
    .catch(err => failure(res, 'failed to update user (' + err.message + ')'))

  // * Q: don't know what should be allowed to be updated
  // * A: probably only allow:
  // *    - fullname (100%; fullname shouldn't really matter),
  // *    - email    (maybe requires confirmation email potentially),
  // *    - password (maybe requires some other kind of interaction; maybe mfa)
  // *      -> should maybe do this using some other kind of api?
  // *    - metadata (shouldn't have any kind of serious restrictions)

  success(res, 'successfully modified user', {})
}

export {
  modify
}
