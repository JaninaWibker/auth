import type { Request, Response } from 'express'
import { Adapters } from '../../types/adapter'

import { success, failure } from '../../util/response'
import { check_permission } from '../../util/check_permission'

const get = (db: Adapters) => (req: Request, res: Response) => {

  if(!check_permission(req.user, 'auth.device', 'get')) {
    return failure(res, 'insufficient permissions, \'auth.device:get\' is required')
  }

  db.device.find_device.by_id_user(req.params.id, req.user.id)
    .then(list => success(res, 'successfully retrieved device', list))
    .catch((err: Error) => failure(res, 'failed to retrieve device: ' + err.message))
}

export {
  get
}
