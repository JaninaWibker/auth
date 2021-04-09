import type { Adapters, UserAdapter } from '../types/adapter'
import type { Config } from '../types/config'


const postgres_adapter = (): Promise<Adapters> => new Promise((resolve, reject) => {

const postgres_adapter = (config: Config): Promise<Adapters> => new Promise((resolve, reject) => {

  // TODO: do init stuff

  const db_config = {
    database: 'auth',
    host: config.db.host,
    port: config.db.port,
    user: config.db.username,
    password: config.db.password,
    ssl: config.db.use_ssl
  }

  const pool = new Pool(db_config)

  pool.on('error', (err: Error) => {
    console.warn('An idle client has experienced an error', err)
  })


  const list_users_basic = () => Promise.reject('not implemented yet')
  const list_users_detailed = () => Promise.reject('not implemented yet')


  const get_user = () => Promise.reject(new Error('not implemented yet'))

  const user_adapter: UserAdapter = {
    list_users_basic,
    list_users_detailed,
    get_user,
  }

  resolve({ user: user_adapter })
})

export {
  postgres_adapter
}
