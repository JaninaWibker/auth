import type { Config } from '../types/config'

export type Environment = Partial<{
  PORT: string,
  ISSUER: string,
  AUDIENCE: string,
  ENV: string
}>

const transform = (env: Environment, private_key: string, public_key: string): Config => {
  return {
    port: env.PORT ? +env.PORT : 3003,
    env: env.ENV ? (env.ENV.toLowerCase() as Config['env']) : 'dev',
    private_key: private_key,
    public_key: public_key,
    jwt: {
      iss: env.ISSUER || 'TODO', // TODO: what should this be if nothing is specified?
      aud: env.AUDIENCE || 'TODO'
    }
  }
}

export default transform
