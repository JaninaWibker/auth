import type { Request, Response } from 'express'

const test = (req: Request, res: Response) => {
  res.end('test')
}

export {
  test
}
