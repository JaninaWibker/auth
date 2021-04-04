import {  list  } from './list'

import { login  } from './login'
import { logout } from './logout'

import { Router } from 'express'

import type { Strategy } from '../types/strategy'

const userRouter = (strategy: Strategy) => {
  const router = Router()

  const user = {
    list, login, logout
  }

  // * login / logout

  router.post('/login',  user.login(strategy))
  router.post('/logout', user.logout(strategy))

  // * user endpoint

  router.get('/',                      strategy.authenticated, user.list)
  return router
}

export default userRouter
