import { Router } from 'express'
import type { Adapters } from '../../types/adapter'
import type { Strategy } from '../../types/strategy'

const configRouter = (strategy: Strategy, db: Adapters) => {
  const router = Router()

  const config = {

  }

  //* config endpoints

  return router
}

export default configRouter
