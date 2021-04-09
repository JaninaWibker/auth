import type { Config } from '../types/config'

export type Environment = Partial<{
  PORT: string,
  ISSUER: string,
  AUDIENCE: string,
  ENV: string,
  DB_DRIVER: Config['db']['driver'],
  DB_HOST: Config['db']['host'],
  DB_PORT: string,
  DB_USERNAME: Config['db']['username'],
  DB_PASSWORD: Config['db']['password'],
  DB_USE_SSL: 'true' | 'false',
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
    },
    db: {
      driver: env.DB_DRIVER || 'postgres',
      host: env.DB_HOST || '',
      port: env.DB_PORT ? +env.DB_PORT : 5432,
      username: env.DB_USERNAME || 'auth',
      password: env.DB_PASSWORD || '',
      use_ssl: env.DB_USE_SSL === 'true'
    }
  }
}

export default transform
