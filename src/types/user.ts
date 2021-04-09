import * as D from 'io-ts/Decoder'

import { group_id } from './group'
import { permission } from './permission'
import { withId, with_id } from './util'

const user_without_id = D.intersect(D.struct({
  username: D.string,
  email: D.string,
  groups: D.array(group_id),
  permissions: D.array(permission),
}))(D.partial({
  fullname: D.string,
}))

const user = with_id(user_without_id, D.number)

export {
  user_without_id,
  user
}

export type UserWithoutId = D.TypeOf<typeof user_without_id>
export type User = withId<UserWithoutId, string>

