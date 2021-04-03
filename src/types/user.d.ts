import type { withId } from './util'

import type { Group } from './group'
import type { Permission } from './permission'

export type UserWithoutId = {
  username: string,
  name: string,
  email: string,
  groups: Group['id'][],
  permissions: Permission[]
}

export type User = withId<UserWithoutId, string>
