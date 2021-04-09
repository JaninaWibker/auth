import { Pool, QueryResult } from 'pg'
import type { PoolClient } from 'pg'
import type { Adapters, UserAdapter } from '../types/adapter'
import type { Config } from '../types/config'

type UserRowSimple = {
  id: string,
  username: string,
  fullname: string | null,
  email: string,
  password: string, // TODO: string? isn't this maybe binary data?
  salt: string,     // TODO: string? isn't this maybe binary data?
  creation_date: Date,
  modification_date: Date,
  metadata: Record<string, unknown>,
  disabled: boolean,
  mfa: boolean,
  mfa_secret: string | null,
  passwordless: boolean,
  temp_account: Date,
  role_id: string | null
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

const rows_to_object = <T, R>(rows: T[], keys: (keyof T)[], inverted_keys: (keyof T)[]): R[] => {
  console.log(rows, keys, inverted_keys)
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

  const release_then = (client: PoolClient) => () => {
    client.release()
  }

  const release_catch = (client: PoolClient) => (err: Error) => {
    client.release()
    if(err) console.log(err)
  }

  const list_users_basic = () => pool.connect().then(client =>
    client.query('SELECT * FROM auth_user')
      .then((res: QueryResult<UserRowSimple>) => res.rows.map(row => ({
        id: row.id,
        username: row.username,
        fullname: row.fullname === null ? undefined : row.fullname,
        email: row.email,
        groups: [],
        permissions: []
      })))
  )

  const list_users_detailed = () => pool.connect().then(client =>
    client.query('SELECT * FROM auth_user_all')
      .then((res: QueryResult<UserRowDetailed>) => {
        const mapped: UserRowDetailedMapped[] = rows_to_object<UserRowDetailed, UserRowDetailedMapped>(res.rows, user_row_detailed_keys, user_row_detailed_inverted_keys)
        console.log('blub', mapped)
        return mapped.map(row => ({
          id: row.id,
          username: row.username,
          fullname: row.fullname !== null ? row.fullname : undefined,
          email: row.email,
          groups: row.group_id,
          permissions: row.role_permission_scope.map((scope, i) => ({ scope: scope, name: row.role_permission_name[i] }))
        }))
      })
      .catch(err => {
        console.warn(err)
        throw err
      })
  )

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
