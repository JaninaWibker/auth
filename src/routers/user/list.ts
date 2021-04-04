import type { Request, Response } from 'express'
import { Adapters } from '../../types/adapter'

import { success, failure } from '../../util/response'

const list = (db: Adapters) => (req: Request, res: Response) => {
  console.log(req.user)

  // TODO: check that the has the proper permissions (this might need to be moved somewhere else for simplicity)

  db.user.list_users()
    .then(list => success(res, 'successfully listed users', list))
    .catch((err: Error) => failure(res, 'failed to retrieve list of users: ' + err.message))

}

export {
  list
}
