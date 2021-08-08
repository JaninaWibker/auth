import { Router } from 'express'
import type { Adapters } from '../../types/adapter'
import type { Strategy } from '../../types/strategy'
import FEATURES from '../../features'

import {   get  } from './get'
import {  list  } from './list'
import { remove } from './delete'

const deviceRouter = (strategy: Strategy, db: Adapters) => {
  const router = Router()

  const device = {
    list, delete: remove, get
  }

  // * device endpoints
  if(FEATURES.DISABLE_DEVICE_IDS) {
    router.get('/',           strategy.authenticated, device.list(db))
    router.get('/by-id/:id',  strategy.authenticated, device.get(db))
    router.delete('/',        strategy.authenticated, device.delete(db))
  }

  return router
}

export default deviceRouter
