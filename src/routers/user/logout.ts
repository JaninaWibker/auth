import type { Request, Response } from 'express'
import { Strategy } from '../../types/strategy'
import type { Adapters } from '../../types/adapter'
import { failure, success } from '../../util/response'

const logout = (strategy: Strategy) => (req: Request, res: Response) => {

  strategy.logout(req.user.id)
    .then((idk) => {
      console.log(idk)
      success(res, 'successfully logged out', idk)
    })
    .catch((err: Error) => failure(res, 'failed to log out: ' + err.message))
}

export {
  logout
}
