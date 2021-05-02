import type { Request, Response } from 'express'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { check_permission } from '../../util/check_permission'
import { success, failure } from '../../util/response'
import { uuid } from '../../types/user'

// TODO: this should include more things
const admin_modify_request = D.struct({
  target_id: uuid,
  changes: D.partial({
    username: D.string,
    fullname: D.nullable(D.string),
    email: D.string,
    password: D.string,
    metadata: D.UnknownRecord,
  })
})

type AdminModifyRequest = D.TypeOf<typeof admin_modify_request>

const admin_modify = (req: Request, res: Response) => {

  const result = admin_modify_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  const body = req.body as AdminModifyRequest

  if(!check_permission(req.user, 'auth.user', 'modify-other')) {
    return failure(res, 'insufficient permissions, \'auth.user:modify-other\' is required')
  }

  // TODO: actually do something with the requested changes

  success(res, 'successfully modified user', {})
}

export {
  admin_modify
}
