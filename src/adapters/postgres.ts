import { Pool, QueryResult } from 'pg'
import type { Adapters, DeviceAdapter, UserAdapter } from '../types/adapter'
import type { Config } from '../types/config'
import type { FullUser } from '../types/user'

type UserRowSimple = {
  id: string,
  username: string,
  fullname: string | null,
  email: string,
  password: string,
  salt: string,
  creation_date: Date,
  modification_date: Date,
  metadata: Record<string, unknown>,
  disabled: boolean,
  mfa: boolean,
  mfa_secret: string | null,
  passwordless: boolean,
  temp_account: Date,
  role_id: string,
  role_name: string
}

type UserRowSimpleMapped = UserRowSimple & {

}

const user_row_simple_keys: (keyof UserRowSimple)[] = [
  'id', 'username', 'fullname', 'email', 'password', 'salt', 'creation_date', 'modification_date', 'metadata', 'disabled', 'mfa', 'mfa_secret', 'passwordless', 'temp_account', 'role_id'
]

const user_row_simple_inverted_keys: (keyof UserRowSimple)[] = []

type UserRowDetailed = UserRowSimple & {
  role_name: string,
  group_id: string | null,
  group_name: string | null,
  role_permission_scope: string | null,
  role_permission_name: string | null,
  group_permission_scope: string | null,
  group_permission_name: string | null
}

type UserRowDetailedMapped = UserRowSimpleMapped & {
  role_name: string,
  group_id: string[],
  group_name: string[],
  role_permission_scope: string[],
  role_permission_name: string[],
  group_permission_scope: string[],
  group_permission_name: string[]
}

const user_row_detailed_keys: (keyof UserRowDetailed)[] = [
  'id', 'username', 'fullname', 'email', 'password', 'salt', 'creation_date', 'modification_date', 'metadata', 'disabled', 'mfa', 'mfa_secret', 'passwordless', 'temp_account', 'role_id', 'role_name'
]

const user_row_detailed_inverted_keys: (keyof UserRowDetailed)[] = [
  'group_id', 'group_name', 'role_permission_scope', 'role_permission_name', 'group_permission_scope', 'group_permission_name'
]

type DeviceRow = {
  device_id: string,
  useragent: string,
  ip: string
}

const rows_to_object = <T, R>(rows: T[], keys: (keyof T)[], inverted_keys: (keyof T)[]): R[] => {
  const obj: Partial<R>[] = []
  let count = -1
  rows.forEach((row, i) => {
    // @ts-ignore
    if(i === 0 || row[keys[0]] !== obj[count][keys[0]]) {
      obj.push(Object.fromEntries(keys.map(key => [key, rows[i][key]])) as unknown as Partial<R>)
      count++
      // @ts-ignore
      inverted_keys.forEach(key => obj[count][key] = row[key] !== null ? [row[key]] : [])
    } else {
      // @ts-ignore
      inverted_keys.forEach(key => row[key] !== null && obj[count][key].push(row[key]))
    }
  })
  return obj as R[]
}

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

  const list_users_basic = (): Promise<FullUser[]> => pool.connect().then(client =>
    client.query('SELECT A.*, B.name as role_name FROM auth_user A LEFT JOIN auth_role B ON A.role_id = B.id')
      .then((res: QueryResult<UserRowSimple>) => res.rows.map(row => {
        client.release()
        return {
          id: row.id,
          username: row.username,
          fullname: row.fullname,
          email: row.email,
          groups: [],
          permissions: [],
          creation_date: row.creation_date,
          modification_date: row.modification_date,
          disabled: row.disabled,
          role: {
            id: row.role_id,
            name: row.role_name
          },
          salt: row.salt,
          password: row.password,
          metadata: row.metadata,
          passwordless: row.passwordless,
          temp_account: +row.temp_account,
          mfa: row.mfa,
          mfa_secret: row.mfa_secret
        }
      }))
      .catch(err => {
        client.release(err)
        console.warn(err)
        throw err
      })
  )

  const list_users_detailed = (): Promise<FullUser[]> => pool.connect().then(client =>
    client.query('SELECT * FROM auth_user_all')
      .then((res: QueryResult<UserRowDetailed>) => {
        const mapped: UserRowDetailedMapped[] = rows_to_object<UserRowDetailed, UserRowDetailedMapped>(res.rows, user_row_detailed_keys, user_row_detailed_inverted_keys)
        console.log('mapped', mapped)
        client.release()
        return mapped.map(row => ({
          id: row.id,
          username: row.username,
          fullname: row.fullname,
          email: row.email,
          groups: row.group_id,
          permissions: row.role_permission_scope.map((scope, i) => ({ scope: scope, name: row.role_permission_name[i] })),
          creation_date: row.creation_date,
          modification_date: row.modification_date,
          disabled: row.disabled,
          role: {
            id: row.role_id,
            name: row.role_name
          },
          salt: row.salt,
          password: row.password,
          metadata: row.metadata,
          passwordless: row.passwordless,
          temp_account: +row.temp_account,
          mfa: row.mfa,
          mfa_secret: row.mfa_secret
        }))
      })
      .catch(err => {
        client.release()
        console.warn(err)
        throw err
      })
  )

  const get_user = (by: 'id' | 'username', id_or_username: string): Promise<FullUser> => pool.connect().then(client => {
    const selector = by === 'id' ? 'id = $1::text' : by === 'username' ? 'username = $1::text' : ''
    return client.query('SELECT * FROM auth_user_all WHERE ' + selector, [id_or_username])
      .then((res: QueryResult<UserRowDetailed>) => {
        if(res.rowCount === 0) throw new Error(`user not found (by ${by}: ${id_or_username})`)

        const user: UserRowDetailedMapped = rows_to_object<UserRowDetailed, UserRowDetailedMapped>(res.rows, user_row_detailed_keys, user_row_detailed_inverted_keys)[0]
        console.log('mapped', user)
        client.release()
        return {
          id: user.id,
          username: user.username,
          fullname: user.fullname,
          email: user.email,
          groups: user.group_id,
          permissions: user.role_permission_scope.map((scope, i) => ({ scope: scope, name: user.role_permission_name[i] })),
          creation_date: user.creation_date,
          modification_date: user.modification_date,
          disabled: user.disabled,
          role: {
            id: user.role_id,
            name: user.role_name
          },
          salt: user.salt,
          password: user.password,
          metadata: user.metadata,
          passwordless: user.passwordless,
          temp_account: +user.temp_account,
          mfa: user.mfa,
          mfa_secret: user.mfa_secret
        }
      })
      .catch(err => {
        client.release()
        console.warn(err)
        throw err
      })
  })

  const find_device_by_id = (device_id: string) => pool.connect().then(client =>
    client.query('SELECT id as device_id, useragent, ip FROM auth_device WHERE id = $1::uuid', [device_id])
      .then((res: QueryResult<DeviceRow>) => {
        if(res.rowCount === 0) throw new Error(`device not found (by id: ${device_id})`)

        console.log(res.rows)

        return res.rows[0]
      })
  )

  const find_device_by_id_user = (device_id: string, user_id: string) => pool.connect().then(client =>
    client.query('SELECT B.id as device_id, B.useragent, B.ip FROM auth_it_user_device A LEFT JOIN auth_device B ON A.device_id = B.id WHERE A.device_id = $1::uuid AND A.user_id = $2::uuid', [device_id, user_id])
      .then((res: QueryResult<DeviceRow>) => {
        if(res.rowCount === 0) throw new Error(`device not found (by user_id, device_id: ${user_id}, ${device_id}`)
        client.release()
        return res.rows[0]
      })
      .catch(err => {
        client.release()
        throw err
      })
  )

  const find_devices_by_user = (user_id: string) => pool.connect().then(client =>
    client.query('SELECT B.id as device_id, B.useragent, B.ip FROM auth_it_user_device A LEFT JOIN auth_device B ON A.device_id = B.id WHERE A.user_id = $1::uuid', [user_id])
      .then((res: QueryResult<DeviceRow>) => {
        client.release()
        return res.rows
      })
      .catch(err => {
        client.release()
        throw err
      })
  )

  const find_device_by_user_useragent_ip = (user_id: string, useragent: string, ip: string) => pool.connect().then(client =>
    client.query('SELECT B.id as B.device_id, B.useragent, B.ip FROM auth_it_user_device A LEFT JOIN auth_device B ON A.id = B.device WHERE A.user_id = $1::uuid AND B.useragent = $2::string AND B.ip = $3::string', [user_id, useragent, ip])
      .then((res: QueryResult<DeviceRow>) => {
        if(res.rowCount === 0) throw new Error(`device not found (by user_id, useragent and ip: ${user_id}, ${useragent}, ${ip})`)
        client.release()
        return res.rows
      })
      .catch(err => {
        client.release()
        throw err
      })
  )

  /**
   * Deletes a device from a user.
   * If the device is not used by anyone after that it is also deleted
   */
  const delete_device_by_user_device_id = (user_id: string, device_id: string) => pool.connect().then(client =>
    client.query('SELECT device_id, user_id FROM auth_it_user_device WHERE device_id = $1::uuid', [device_id])
      .then(res => {
        console.log('1', res)
        if(res.rowCount === 0) {
          throw new Error('device not found')
        } else if(res.rowCount === 1) {
          // can delete both things here (auth_it_device will cascade)
          return client.query('DELETE FROM auth_device WHERE id = $1::uuid', [device_id])
        } else {
          // can delete only auth_it_user_device here
          return client.query('DELETE FROM auth_it_user_device WHERE user_id = $1::uuid AND device_id = $2::uuid', [user_id, device_id])
        }
      })
      .then(res => {
        console.log('2', res)
        if(res.rowCount !== 1) {
          throw new Error('device not found')
        }
        client.release()
      })
      .catch(err => {
        client.release()
        throw err
      })
  )

  /**
   * Delete a device.
   * This also removes the device from all users
   */
  const delete_device_by_device_id = (device_id: string) => pool.connect().then(client =>
    client.query('DELETE FROM auth_device WHERE id = $1::uuid', [device_id])
      .then(res => {
        if(res.rowCount !== 1) {
          throw new Error('device not found')
        }
        client.release()
      })
      .catch(err => {
        client.release()
        throw err
      })
  )

  const update_or_create_device = (device_id: string, user_id: string, useragent: string, ip: string) => pool.connect().then(client =>
    client.query('SELECT * FROM auth_it_user_device WHERE device_id = $1::uuid AND user_id = $2::uuid', [device_id, user_id])
      .then(res => {
        if(res.rowCount === 0) {
          return client.query('INSERT INTO auth_device ( useragent, ip ) VALUES ( $1::text, $2::text ) RETURNING id', [useragent, ip])
            .then(res => {
              if(res.rowCount === 1) {
                return client.query('INSERT INTO auth_it_user_device ( device_id, user_id ) VALUES ( $1::text, $2::text )', [res.rows[0].id, user_id])
              } else {
                throw new Error('couldn\'t create new device')
              }
            })
        } else {
          return client.query('UPDATE auth_device SET useragent = $1::text, ip = $2::text WHERE id = $1::uuid', [useragent, ip, device_id])
        }
      })
      .then(() => client.release())
      .catch(err => {
        client.release()
        throw err
      })
  )

  const user_adapter: UserAdapter = {
    list_users_basic,
    list_users_detailed,
    get_user,
  }

  const device_adapter: DeviceAdapter = {
    find_device: {
      by_id: find_device_by_id,
      by_id_user: find_device_by_id_user,
      by_user: find_devices_by_user,
      by_user_useragent_ip: find_device_by_user_useragent_ip,
    },
    delete_device: {
      by_device_id: delete_device_by_device_id,
      by_user_device_id: delete_device_by_user_device_id,
    },
    update_or_create_device: update_or_create_device
  }

  resolve({ user: user_adapter, device: device_adapter })
})

export {
  postgres_adapter
}
