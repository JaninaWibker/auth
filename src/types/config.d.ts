type Config = {
  port: number,
  env: 'dev' | 'prod' | 'test',
  public_key: string,
  private_key: string,
  jwt: {
    iss: string,
    aud: string
  }
}

export {
  Config
}
