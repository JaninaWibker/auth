import { Adapters } from '../types/adapter'
import { Config } from '../types/config'
import { postgres_adapter } from './postgres'

const adapters = (config: Config): Promise<Adapters> => {
  switch(config.db_driver) {
    case 'postgres': {
      return postgres_adapter()
    } break
    default:
      throw new Error('forgot to add new db driver to switch statement')
  }
}

export default adapters
