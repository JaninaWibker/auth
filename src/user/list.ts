import type { Request, Response } from 'express'

const list = (req: Request, res: Response) => {
  res.end('list')
}

export {
  list
}
