import * as D from 'io-ts/Decoder'

const permission = D.struct({
  scope: D.string,
  name: D.string
})

export {
  permission
}

export type Permission = D.TypeOf<typeof permission>
