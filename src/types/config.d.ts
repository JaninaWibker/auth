type Config = {
  port: number,
  env: 'dev' | 'prod' | 'test',
  public_key: string,
  private_key: string,
  jwt: {
    iss: string,
    aud: string
  },
  db_driver: 'postgres' // TODO: add sqlite or something else here eventually
}

export {
  Config
}
