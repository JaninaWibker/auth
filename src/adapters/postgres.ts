import type { Adapters, UserAdapter } from '../types/adapter'

const postgres_adapter = (): Promise<Adapters> => new Promise((resolve, reject) => {

  // TODO: do init stuff

  const user_adapter: UserAdapter = {
    list_users: () => Promise.reject(new Error('not implemented yet')),
    get_user: () => Promise.reject(new Error('not implemented yet'))
  }

  resolve({ user: user_adapter })
})

export {
  postgres_adapter
}
