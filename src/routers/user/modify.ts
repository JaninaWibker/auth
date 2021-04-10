import type { Request, Response } from 'express'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { check_permission } from '../../util/check_permission'
import { success, failure } from '../../util/response'
import { uuid } from '../../types/user'

const modify_request = D.struct({
  target_id: uuid,
  changes: D.partial({
    username: D.string,
    fullname: D.nullable(D.string),
    email: D.string,
    password: D.string,
    metadata: D.UnknownRecord,
  })
})

type ModifyRequest = D.TypeOf<typeof modify_request>

const modify = (req: Request, res: Response) => {

  const result = modify_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  const body = req.body as ModifyRequest

  const self_modifying = body.target_id === req.user.id

  if(!self_modifying && !check_permission(req.user, 'auth.user', 'modify-other')) {
    return failure(res, 'insufficient permissions, \'auth.user:modify-other\' is required')
  }

  if(self_modifying && !check_permission(req.user, 'auth.user', 'modify-self')) {
    return failure(res, 'insufficient permissions, \'auth.user:modify-self\' is required')
  }

  // TODO: how should admin and normal api requests be differentiated?

  // * Q: don't know what should be allowed to be updated
  // * A: probably only allow:
  // *    - username (if it doesn't conflict with something else; maybe even disallow it completely),
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
