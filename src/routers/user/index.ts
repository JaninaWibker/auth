import { Router } from 'express'
import adapters from '../../adapters/adapter'
import type { Strategy } from '../../types/strategy'
import type { Config } from '../../types/config'

import {  list  } from './list'

import { login  } from './login'
import { logout } from './logout'

const userRouter = (strategy: Strategy, config: Config) => adapters(config)
  .then(db => {
    const router = Router()

    const user = {
      list, login, logout
    }

    // * login / logout

    router.post('/login',  user.login(strategy))
    router.post('/logout', user.logout(strategy))

    // * user endpoint

    router.get('/',                      strategy.authenticated, user.list(db))

    return router
  })

export default userRouter
