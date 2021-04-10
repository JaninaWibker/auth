import type { Request, Response } from 'express'
import { check_permission } from '../../util/check_permission'
import { success, failure } from '../../util/response'

const info = (req: Request, res: Response) => {

  if(!check_permission(req.user, 'auth.user', 'info')) {
    return failure(res, 'insufficient permissions, \'auth.user:info\' is required')
  }

  // TODO: what does info actually do?
  success(res, 'successfully retrieved user information', {})
}

export {
  info
}
