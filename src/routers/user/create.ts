import type { Request, Response } from 'express'
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

const create = (req: Request, res: Response) => {

  const result = create_request.decode(req.body)

  if(isLeft(result)) {
    return failure(res, 'invalid structure. The following was reported:\n' + D.draw(result.left))
  }

  const body = req.body as CreateRequest

  failure(res, 'not implemented yet')
}

export {
  create
}
