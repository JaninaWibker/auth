import fs from 'fs'
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
  DB_PASSWORD_FILE: string,
  DB_USE_SSL: 'true' | 'false',
  CERTS_PRIVATE_KEY: string,
  CERTS_PUBLIC_KEY: string,
}>

const transform = (env: Environment): Omit<Config, 'public_key' | 'private_key'> => {

  const password = env.DB_PASSWORD_FILE && !env.DB_PASSWORD
    ? fs.readFileSync(env.DB_PASSWORD_FILE, 'utf8')
    : (env.DB_PASSWORD || '')

  return {
    port: env.PORT ? +env.PORT : 3003,
    env: env.ENV ? (env.ENV.toLowerCase() as Config['env']) : 'dev',
    cert_files: {
      public_key:  env.CERTS_PUBLIC_KEY  ? env.CERTS_PUBLIC_KEY  : './certs/auth/private-key.pem',
      private_key: env.CERTS_PRIVATE_KEY ? env.CERTS_PRIVATE_KEY : './certs/auth/public-key.pem'
    },
    jwt: {
      iss: env.ISSUER || 'TODO', // TODO: what should this be if nothing is specified?
      aud: env.AUDIENCE || 'TODO'
    },
    db: {
      driver: env.DB_DRIVER || 'postgres',
      host: env.DB_HOST || '',
      port: env.DB_PORT ? +env.DB_PORT : 5432,
      username: env.DB_USERNAME || 'auth',
      password: password,
      use_ssl: env.DB_USE_SSL === 'true'
    }
  }
}

export default transform
