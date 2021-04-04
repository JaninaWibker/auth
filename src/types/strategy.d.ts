import type { NextFunction, Request, Response } from 'express'
import type { User } from './user'

type Strategy = {
  authenticated: (req: Request, res: Response, next: NextFunction) => void,
  generate: (user: User, jti: string) => string
}
