import { Router } from 'express'
import type { Adapters } from '../../types/adapter'
import type { Strategy } from '../../types/strategy'

import { export_data } from './export_data'
import { import_data } from './import_data'
import { features    } from './features'

const configRouter = (strategy: Strategy, db: Adapters) => {
  const router = Router()

  const config = {
    export_data, import_data, features
  }

  //* config endpoints

  router.get('/export-data',  strategy.authenticated, config.export_data(db))
  router.post('/import-data', strategy.authenticated, config.import_data(db))

  router.get('/features', config.features())

  return router
}

export default configRouter
