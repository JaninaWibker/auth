import * as D from 'io-ts/Decoder'

import { group_id } from './group'
import { permission } from './permission'
import { withId, with_id } from './util'

const date: D.Decoder<unknown, Date> = {
  decode: (u) => u instanceof Date ? D.success(u) : D.failure(u, 'Date')
}

const date_from_iso_string: D.Decoder<unknown, string> = {
  decode: (u) => typeof u === 'string' && !Number.isNaN(new Date(u).getTime()) ? D.success(u) : D.failure(u, 'date as ISO string')
}

const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const uuid: D.Decoder<unknown, string> = {
  decode: (u) => typeof u === 'string' && uuid_regex.test(u) ? D.success(u) : D.failure(u, 'UUID')
}

const hex: D.Decoder<unknown, string> = {
  decode: (u) => typeof u === 'string' && /^(?:0x)?[0-9a-f]+$/i.test(u) ? D.success(u) : D.failure(u, 'hex string')
}

const full_user = D.struct({
  id: uuid,
  username: D.string,
  fullname: D.nullable(D.string),
  email: D.string,
  groups: D.array(group_id),
  permissions: D.array(permission),
  creation_date: date,
  modification_date: date,
  disabled: D.boolean,
  salt: D.string,
  password: hex,
  metadata: D.UnknownRecord,
  passwordless: D.boolean,
  temp_account: D.number,
  mfa: D.boolean,
  mfa_secret: D.nullable(D.string),
  role: D.struct({
    id: D.string,
    name: D.string
  }),
})

const user_without_id = D.struct({
  username: D.string,
  fullname: D.nullable(D.string),
  email: D.string,
  groups: D.array(group_id),
  permissions: D.array(permission),
  creation_date: date,
  modification_date: date,
  role: D.struct({
    id: D.string,
    name: D.string
  })
})

const serialized_user_without_id = D.struct({
  username: D.string,
  fullname: D.nullable(D.string),
  email: D.string,
  groups: D.array(group_id),
  permissions: D.array(permission),
  creation_date: date_from_iso_string,
  modification_date: date_from_iso_string,
  role: D.struct({
    id: D.string,
    name: D.string
  })
})

const user = with_id(user_without_id, uuid)

const serialized_user = with_id(serialized_user_without_id, uuid)

const full_user_to_user = (user: FullUser): User => ({
  id: user.id,
  username: user.username,
  fullname: user.fullname,
  email: user.email,
  groups: user.groups,
  permissions: user.permissions,
  creation_date: user.creation_date,
  modification_date: user.modification_date,
  role: user.role
})

const serialized_user_to_user = (user: SerializedUser): User => ({
  ...user,
  creation_date: new Date(user.creation_date),
  modification_date: new Date(user.modification_date),
})

const user_to_serialized_user = (user: User): SerializedUser => ({
  ...user,
  creation_date: user.creation_date.toISOString(),
  modification_date: user.modification_date.toISOString(),
})

export {
  user_without_id,
  serialized_user_without_id,
  user,
  serialized_user,
  full_user_to_user,
  serialized_user_to_user,
  user_to_serialized_user,
  date,
  date_from_iso_string,
  uuid,
  hex,
}

export type FullUser = D.TypeOf<typeof full_user>

export type UserWithoutId = D.TypeOf<typeof user_without_id>
export type User = withId<UserWithoutId, string>

export type SerializedUserWithoutId = D.TypeOf<typeof serialized_user_without_id>
export type SerializedUser = withId<SerializedUserWithoutId, string>
