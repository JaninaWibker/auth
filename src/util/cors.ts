import type { NextFunction, Request, Response } from 'express'

const cors = (req: Request, res: Response, next: NextFunction) => {

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Device-Id') // TODO: potentially add more useful headers here

  // TODO: why is this needed exactly?
  if(!req.get('origin')) {
    return next()
  }

  // TODO: maybe do some stuff here depending on url; could also have this be defined using the options
  res.header('Access-Control-Allow-Origin', '*')

  next()
}

export default cors
