import * as D from 'io-ts/Decoder'

const jwt_payload_base = D.struct({
  iat: D.number,
  exp: D.number,
  aud: D.string,
  iss: D.string,
  sub: D.string,
  jti: D.string
})

const jwt_payload = <T>(t: D.Decoder<unknown, T>) => D.intersect(jwt_payload_base)(t)

export type JWTPayloadBase = D.TypeOf<typeof jwt_payload_base>

export type JWTPayload2 = D.TypeOf<typeof jwt_payload>

export type JWTPayload<T = void> = JWTPayloadBase & T

export {
  jwt_payload_base,
  jwt_payload
}
