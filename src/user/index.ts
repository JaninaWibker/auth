import {  list  } from './list'
import { Router } from 'express'

import type { Strategy } from '../types/strategy'

const userRouter = (strategy: Strategy) => {
  const router = Router()

  const user = {
    list
  }

  // * user endpoint

  router.get('/',                      strategy.authenticated, user.list)
  return router
}

export default userRouter
