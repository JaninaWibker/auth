import type { NextFunction, Request, Response } from 'express'

const cors = (req: Request, res: Response, next: NextFunction) => {
  // TODO: do all the cors related things here
  next()
}

export default cors
