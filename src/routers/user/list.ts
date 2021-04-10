import type { Request, Response } from 'express'
import { Adapters } from '../../types/adapter'
import { full_user_to_user } from '../../types/user'

import { success, failure } from '../../util/response'
import { check_permission } from '../../util/check_permission'

const list = (db: Adapters) => (req: Request, res: Response) => {

  if(!check_permission(req.user, 'auth.user', 'list')) {
    return failure(res, 'insufficient permissions, \'auth.user:list\' is required')
  }

  db.user.list_users_detailed()
    .then(list => list.map(full_user_to_user))
    .then(list => success(res, 'successfully listed users', list))
    .catch((err: Error) => failure(res, 'failed to retrieve list of users: ' + err.message))
}

export {
  list
}
