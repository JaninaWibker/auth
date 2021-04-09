import * as D from 'io-ts/Decoder'

const jwt_payload_base = (type: 'access-token' | 'refresh-token') => D.struct({
  type: D.literal(type),
  iat: D.number,
  exp: D.number,
  aud: D.string,
  iss: D.string,
  sub: D.string,
  jti: D.string
})

const jwt_payload = <T>(t: D.Decoder<unknown, T>) => (type: 'access-token' | 'refresh-token') => D.intersect(jwt_payload_base(type))(t)

const access_token_base = jwt_payload_base('access-token')
const refresh_token_base = jwt_payload_base('refresh-token')

export type JWTPayloadBase = D.TypeOf<typeof access_token_base | typeof refresh_token_base>

export type JWTPayload<T = void> = JWTPayloadBase & T

export {
  jwt_payload_base,
  jwt_payload
}
