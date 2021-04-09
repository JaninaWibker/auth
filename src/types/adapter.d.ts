import type { FullUser } from './user'

export interface UserAdapter {
  list_users_basic: () => Promise<Omit<FullUser, 'groups' | 'permissions'>[]>
  list_users_detailed: () => Promise<FullUser[]>
  get_user: (by: 'id' | 'username', id_or_username: string) => Promise<FullUser>
}

export type Adapters = {
  user: UserAdapter
}
