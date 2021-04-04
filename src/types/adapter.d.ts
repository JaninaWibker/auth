import type { User } from './user'

export interface UserAdapter {
  list_users: () => Promise<User[]>
  get_user: () => Promise<User>
}

export type Adapters = {
  user: UserAdapter
}
