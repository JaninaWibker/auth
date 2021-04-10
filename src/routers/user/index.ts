import { Router } from 'express'
import type { Strategy } from '../../types/strategy'
import type { Adapters } from '../../types/adapter'

import {  list  } from './list'

import { login  } from './login'
import { logout } from './logout'

const userRouter = (strategy: Strategy, db: Adapters) => {
  const router = Router()

  const user = {
    list, login, logout
  }

  // * login / logout

  router.post('/login',  user.login(db, strategy))
  router.post('/logout', user.logout(strategy))

  // * user endpoint

  router.get('/',                      strategy.authenticated, user.list(db))

  return router
}

export default userRouter
