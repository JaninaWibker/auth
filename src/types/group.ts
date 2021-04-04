import { permission } from './permission'
import * as D from 'io-ts/Decoder'

const group_id = D.string

const group = D.struct({
  id: group_id,
  permissions: D.array(permission)
})

export {
  group_id,
  group
}

export type Group = D.TypeOf<typeof group>
