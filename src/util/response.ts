import type { Response } from 'express'

const success = <T>(res: Response, msg: string, data: T) => res.status(200).json({
  status: 'success',
  message: msg,
  data: data
})

const failure = (res: Response, msg: string) => res.status(400).json({
  status: 'failure',
  message: msg
})

export {
  success,
  failure
}
