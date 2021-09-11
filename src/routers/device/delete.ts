import type { Request, Response } from 'express'
import type { Adapters } from '../../types/adapter'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { success, failure } from '../../util/response'
import { check_permission } from '../../util/check_permission'
import { uuid } from '../../types/user'

const delete_request = D.struct({
  device_id: uuid
})

const remove = (db: Adapters) => (req: Request, res: Response) => {

  if(!check_permission(req.user, 'auth.device', 'delete')) {
    return failure(res, 'insufficient permissions, \'auth.device:delete\' is required')
  }

  const result = delete_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid JSON body structure. The following was reported:\n' + D.draw(result.left))
  }

  db.device.delete_device.by_user_device_id(req.user.id, req.body.device_id)
    .then(() => success(res, 'successfully deleted device', undefined))
    .catch((err: Error) => failure(res, 'failed to delete device: ' + err.message))
}

export {
  remove
}
