import { Router } from 'express'
import type { Strategy } from '../../types/strategy'
import type { Adapters } from '../../types/adapter'

import {  list  } from './list'
import {  info  } from './info'
import {  test  } from './test'
import { create } from './create'
import { modify } from './modify'
import { admin_modify } from './admin_modify'
import { remove } from './remove'

import { change_password } from './change_password'
import { delete_account  } from './delete_account'

import { login  } from './login'
import { logout } from './logout'

const userRouter = (strategy: Strategy, db: Adapters) => {
  const router = Router()

  const user = {
    list, info, test, create, modify, admin_modify, remove, login, logout, change_password, delete_account
  }

  // * login / logout

  router.post('/login',  user.login(db, strategy))
  router.post('/logout', strategy.authenticated, user.logout(strategy))

  // * user endpoint

  router.get('/',                       strategy.authenticated, user.list(db))
  router.get('/by-id/:id',              strategy.authenticated, user.info) // TODO: what does this actually do?
  router.get('/by-username/:username',  strategy.authenticated, user.info) // TODO: what does this actually do?
  router.get('/by-id/:id',              strategy.authenticated, user.info) // TODO: waht does this actually do?
  router.get('/test',                   strategy.authenticated, user.test)
  router.post('/',                                              user.create)
  router.patch('/',                     strategy.authenticated, user.modify)
  router.patch('/admin/',               strategy.authenticated, user.admin_modify)
  router.delete('/',                    strategy.authenticated, user.remove)

  router.patch('/change-password',      strategy.authenticated, user.change_password(db))
  router.delete('/delete-account',      strategy.authenticated, user.delete_account(db))


  return router
}

export default userRouter
