import { Router } from 'express'
import adapters from '../adapters/adapter'
import type { Strategy } from '../types/strategy'
import type { Config } from '../types/config'

const groupRouter = (strategy: Strategy, config: Config) => adapters(config)
  .then(db => {
    const router = Router()

    const group = {

    }

    //* group endpoints

    return router
  })

export default groupRouter
