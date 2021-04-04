import { Router } from 'express'
import adapters from '../../adapters/adapter'
import type { Strategy } from '../../types/strategy'
import type { Config } from '../../types/config'

const deviceRouter = (strategy: Strategy, config: Config) => adapters(config)
  .then(db => {
    const router = Router()

    const device = {

    }

    // * device endpoints

    return router
  })

export default deviceRouter
