import type { Request, Response } from 'express'
import type { Adapters } from '../../types/adapter'
import { full_user_to_user } from '../../types/user'
import * as D from 'io-ts/Decoder'
import { isLeft } from 'fp-ts/lib/Either'
import { success, failure } from '../../util/response'

const create_request = D.struct({
  username: D.string,
  fullname: D.nullable(D.string),
  password: D.string,
  email: D.string
})

type CreateRequest = D.TypeOf<typeof create_request>

// TODO: make an admin version of this endpoint which uses create_user_full?
const create = (db: Adapters) => (req: Request, res: Response) => {

  const result = create_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid JSON body structure. The following was reported:\n' + D.draw(result.left))
  }

  const body = req.body as CreateRequest

  db.user.create_user(body.username, body.fullname, body.email, body.password)
    .then(db_user => success(res, 'successfully created user', full_user_to_user(db_user)))
    .catch(err => failure(res, 'failed to create user (' + err.message + ')'))
}

export {
  create
}
