import type { Permission } from './permission'

export type Group = {
  id: string,
  permissions: Permission[]
}
