import type { FullUser } from './user'

export interface UserAdapter {
  list_users_basic: () => Promise<Omit<FullUser, 'groups' | 'permissions'>[]>,
  list_users_detailed: () => Promise<FullUser[]>,
  get_user: (by: 'id' | 'username', id_or_username: string) => Promise<FullUser>,
  create_user_full: (username: string, fullname: string | null, password: string, email: string, creation_date: Date | null, modification_date: Date | null, metadata: Record<string, unknown>, disabled: boolean, mfa: boolean, mfa_secret: string | null, passwordless: boolean, temp_account: number, role_id: string) => Promise<FullUser>,
  create_user: (username: string, fullname: string | null, email: string, password: string) => Promise<FullUser>,
  update_user: (target_id: string, changes: Partial<{ fullname: string | null, email: string, password: string, metadata: Record<string, unknown> }>) => Promise<FullUser>
}

export interface DeviceAdapter {
  find_device: {
    by_id: (device_id: string) => Promise<Device>,
    by_id_user: (device_id: string, user_id: string) => Promise<Device>,
    by_user: (user_id: string) => Promise<Device[]>,
    by_user_useragent_ip: (user_id: string, useragent: string, ip: string) => Promise<Device>
  },
  delete_device: {
    by_user_device_id: (user_id: string, device_id: string) => Promise<void>,
    by_device_id: (device_id: string) => Promise<void>
  },
  update_or_create_device: (device_id: string, user_id: string, useragent: string | undefined, ip: string) => Promise<string>,
  create_device: (user_id: string, useragent: string | undefined, ip: string) => Promise<string>
}

export type Adapters = {
  user: UserAdapter,
  device: DeviceAdapter
}
