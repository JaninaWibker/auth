import type { NextFunction, Request, Response } from 'express'
import type { User } from './user'

type Strategy = {
  authenticated: (req: Request, res: Response, next: NextFunction) => void,
  generate: (user: User, jti: string) => string,
  login: (username: string, password_or_refresh_token: string, is_refresh_token: boolean, get_refresh_token: boolean) => Promise<{ user: User, access_token: string, refresh_token?: string }>,
  logout: (username: string) => Promise<undefined>,
}
