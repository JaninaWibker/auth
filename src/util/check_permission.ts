import type { User } from '../types/user'

const check_permission = (user: User, scope: string, name: string) => {
  const found = user.permissions.find(perm => perm.scope === scope && (perm.name === name || perm.name === '*'))
  return found !== undefined
}

export {
  check_permission
}
