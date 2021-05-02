import crypto from 'crypto'

const gen_salt = () => crypto.randomBytes(48).toString('base64')

const hash_password = (password: string, salt: string) => {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  hash.update(salt)
  return hash.digest('hex')
}

export {
  gen_salt,
  hash_password
}
