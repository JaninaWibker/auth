import type { Request, Response } from 'express'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { check_permission } from '../../util/check_permission'
import { success, failure } from '../../util/response'
import { uuid } from '../../types/user'

const admin_delete_request = D.struct({
  target_id: uuid,
})

type AdminDeleteRequest = D.TypeOf<typeof admin_delete_request>

const admin_delete = (req: Request, res: Response) => {

  const result = admin_delete_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  const body = req.body as AdminDeleteRequest

  if(!check_permission(req.user, 'auth.user', 'delete-other')) {
    return failure(res, 'insufficient permissions, \'auth.user:delete-other\' is required')
  }

  // TODO: actually do something with the requested changes

  success(res, 'successfully modified user', {})
}

export {
  admin_delete
}
