import type { Request, Response } from 'express'
import type { Adapters } from '../../types/adapter'
import { check_permission } from '../../util/check_permission'
import { success, failure } from '../../util/response'

const delete_account = (db: Adapters) => (req: Request, res: Response) => {

  if(check_permission(req.user, 'auth.user', 'delete-own-account')) {
    return failure(res, 'insufficient permissions, \'auth.user:delete-own-account\' is required')
  }

  // TODO: maybe do some mfa flow stuff

  failure(res, 'not implemented yet')
}

export {
  delete_account
}
