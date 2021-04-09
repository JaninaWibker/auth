import type { User } from './user'

export interface UserAdapter {
  list_users_basic: () => Promise<Omit<User, 'groups' | 'permissions'>[]>
  list_users_detailed: () => Promise<User[]>
  get_user: () => Promise<User>
}

export type Adapters = {
  user: UserAdapter
}
