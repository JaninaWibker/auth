import type { Adapters } from '../types/adapter'
import type { Config } from '../types/config'
import { postgres_adapter } from './postgres'

const adapters = (config: Config): Promise<Adapters> => {
  switch(config.db.driver) {
    case 'postgres': {
      return postgres_adapter(config)
    } break
    default:
      throw new Error('forgot to add new db driver to switch statement')
  }
}

export default adapters
