import { Router } from 'express'
import type { Adapters } from '../../types/adapter'
import type { Strategy } from '../../types/strategy'

import {   get  } from './get'
import {  list  } from './list'
import { remove } from './delete'

const deviceRouter = (strategy: Strategy, db: Adapters) => {
  const router = Router()

  const device = {
    list, delete: remove, get
  }

  router.get('/',           strategy.authenticated, device.list(db))
  router.get('/by-id/:id',  strategy.authenticated, device.get(db))
  router.delete('/',        strategy.authenticated, device.delete(db))

  // * device endpoints

  return router
}

export default deviceRouter
