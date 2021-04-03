import type { User } from '../../types/user'

declare global {
  namespace Express {
    export interface Request {
      jwt: string,
      user: User
    }
  }
}
