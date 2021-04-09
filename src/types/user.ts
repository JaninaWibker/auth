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

const user_without_id = D.intersect(D.struct({
  username: D.string,
  email: D.string,
  groups: D.array(group_id),
  permissions: D.array(permission),
  creation_date: date,
  modification_date: date
}))(D.partial({
  fullname: D.string,
}))

const serialized_user_without_id = D.intersect(D.struct({
  username: D.string,
  email: D.string,
  groups: D.array(group_id),
  permissions: D.array(permission),
  creation_date: date_from_iso_string,
  modification_date: date_from_iso_string,
}))(D.partial({
  fullname: D.string,
}))

const user = with_id(user_without_id, uuid)

const serialized_user = with_id(serialized_user_without_id, uuid)

export {
  user_without_id,
  serialized_user_without_id,
  user,
  serialized_user,
}

export type UserWithoutId = D.TypeOf<typeof user_without_id>
export type User = withId<UserWithoutId, string>

export type SerializedUserWithoutId = D.TypeOf<typeof serialized_user_without_id>
export type SerializedUser = withId<SerializedUserWithoutId, string>
