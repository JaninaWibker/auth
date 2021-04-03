import { NextFunction, Request, Response } from 'express'

type Strategy = {
  authenticated: (req: Request, res: Response, next: NextFunction) => void,
  generate: () => string
}
