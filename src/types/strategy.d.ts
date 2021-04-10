import type { NextFunction, Request, Response } from 'express'
import type { User } from './user'

type Strategy = {
  authenticated: (req: Request, res: Response, next: NextFunction) => void,
  generate: (type: 'access-token' | 'refresh-token', user: User, jti: string) => string,
  login: (db: Adapters, username: string, password_or_refresh_token_or_mfa_token: string, is_refresh_token: boolean, is_mfa_token: boolean, get_refresh_token: boolean, device_id?: string, mfa_challenge?: string) => Promise<{ user: User, access_token: string, refresh_token?: string } | { mfa_token: string }>,
  logout: (username: string) => Promise<undefined>,
  mfa_generate: () => { base32: string, qrcode: Promise<string> },
  mfa_verify: (secret: string, token: string) => boolean
}
