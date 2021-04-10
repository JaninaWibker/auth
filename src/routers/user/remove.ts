import type { Request, Response } from 'express'

const remove = (req: Request, res: Response) => {
  res.end('remove')
}

export {
  remove
}
