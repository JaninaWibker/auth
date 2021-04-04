export type JWTPayloadBase = {
  iat: number,
  exp: number,
  aud: string,
  iss: string,
  sub: string,
  jti: string
}

export type JWTPayload<T = void> = JWTPayloadBase & T
