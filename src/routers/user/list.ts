import type { Request, Response } from 'express'
import { Adapters } from '../../types/adapter'
import { full_user_to_user } from '../../types/user'

import { success, failure } from '../../util/response'

const list = (db: Adapters) => (req: Request, res: Response) => {
  console.log('req.user', req.user)

  // TODO: check that the has the proper permissions (this might need to be moved somewhere else for simplicity)

  db.user.list_users_detailed()
    .then(list => list.map(full_user_to_user))
    .then(list => success(res, 'successfully listed users', list))
    .catch((err: Error) => failure(res, 'failed to retrieve list of users: ' + err.message))

}

export {
  list
}
