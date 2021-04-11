import type { Request, Response } from 'express'
import { Adapters } from '../../types/adapter'

import { success, failure } from '../../util/response'
import { check_permission } from '../../util/check_permission'

const list = (db: Adapters) => (req: Request, res: Response) => {

  if(!check_permission(req.user, 'auth.device', 'list')) {
    return failure(res, 'insufficient permissions, \'auth.device:list\' is required')
  }

  db.device.find_device.by_user(req.user.id)
    .then(list => success(res, 'successfully listed devices', list))
    .catch((err: Error) => failure(res, 'failed to retrieve list of devices: ' + err.message))
}

export {
  list
}
