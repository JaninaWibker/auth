import type { Request, Response } from 'express'
import type { Adapters } from '../../types/adapter'

import { success, failure } from '../../util/response'
import { check_permission } from '../../util/check_permission'

const export_data = (db: Adapters) => (req: Request, res: Response) => {

  if(!check_permission(req.user, 'auth.config', 'export')) {
    return failure(res, 'insufficient permissions, \'config:export\' is required')
  }

  failure(res, 'not implemented yet :/')
}

export {
  export_data
}
