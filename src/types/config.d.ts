type Config = {
  port: number,
  env: 'dev' | 'prod' | 'test',
  public_key: string,
  private_key: string,
  jwt: {
    iss: string,
    aud: string
  },
  cert_files: {
    public_key: string,
    private_key: string
  },
  db: {
    driver: 'postgres', // TODO: add sqlite or something else here eventually
    host: string,
    port: number,
    username: string,
    password: string,
    use_ssl: boolean
  }
}

export {
  Config
}
