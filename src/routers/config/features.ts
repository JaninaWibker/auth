import type { Request, Response } from 'express'
import FEATURES from '../../features'


const features = () => (req: Request, res: Response) => {
  res.status(200).json(FEATURES).end()
}

export {
  features
}
