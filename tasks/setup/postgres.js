const { Pool } = require('pg')
const fs = require('fs')

const CREATE_TABLE_QUERY = `
CREATE TABLE auth_user (
  id serial PRIMARY KEY,
  first_name VARCHAR(64),
  last_name VARCHAR(64),
  email VARCHAR(256),
  username VARCHAR(128) UNIQUE NOT NULL,
  password VARCHAR(64) NOT NULL, -- sha256 hash of the plain-text password
  salt VARCHAR(64) NOT NULL, -- salt that is appended to the password before it is hashed
  creation_date timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modification_date timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  account_type VARCHAR(16) NOT NULL DEFAULT 'default', -- account type can be: 'default', 'privileged', 'admin'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- custom metadata that can be used in the future
  twofa BOOLEAN DEFAULT false, -- whether 2 factor authentication is enabled or not
  twofa_secret VARCHAR(32) DEFAULT NULL, -- 2 factor authentication secret
  passwordless BOOLEAN DEFAULT false, -- whether a password is set initially or not, if not the password needs to be set when first logging in
  temp_account timestamptz DEFAULT to_timestamp(0) -- 0 for not a temporary account; date value for date the account expires. Upon expiring the account is disabled, deleted or has his account_type set to 'default'
);
`

const INSERT_USER_QUERY = `
INSERT INTO auth_user (
  first_name, last_name, email, username, password, salt, 
  creation_date, modification_date, account_type, metadata, 
  twofa, twofa_secret, passwordless, temp_account
) VALUES (
  $1::text, -- first_name
  $2::text, -- last_name
  $3::text, -- email
  $4::text, -- username
  $5::text, -- (hashed) password
  $6::text, -- salt
  current_timestamp, -- creation_date
  current_timestamp, -- modification_date
  $7::text, -- account_type
  '{}'::jsonb, -- metadata
  false, -- 2fa
  '', -- 2fa_secret
  false, -- passwordless
  to_timestamp(0) -- temp_account
)
`

const config = {
  database: 'auth',
  host: process.env.POSTGRES_SERVER,
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync(process.env.POSTGRES_CA, 'utf8'),
    key: fs.readFileSync(process.env.POSTGRES_KEY, 'utf8'),
    cert: fs.readFileSync(process.env.POSTGRES_CERT, 'utf8')
  }
}

const pool = new Pool(config)

module.exports = () => pool.connect()
  .then(async (client) => {

    console.log('[setup] if table auth_user already exists, drop it')

    await client.query('DROP TABLE IF EXISTS auth_user')

    console.log('[setup] creating auth_user table')

    await client.query(CREATE_TABLE_QUERY)
      .then(res => { console.log('[setup] creating auth_user table successful') })
      .catch(err => { console.error('[setup] creating auth_user table failed', err) })

    console.log('[setup] inserting dummy user "guest"')

    await client.query(INSERT_USER_QUERY, ['first', 'last', 'test@example.com', 'username', 'c42b78633724b8bb7da3bda18b87f3ff4802ca85af7c6418001d509cf220bc61', 'guest', 'default'])
      .then(res => { console.log('[setup] inserting dummy user "guest" successful') })
      .catch(err => { console.error('[setup] inserting dummy user "guest" failed', err) })

    console.log('[setup] inserting dummy user "jannik"')
    
    await client.query(INSERT_USER_QUERY, ['Jannik', 'Wibker', 'jannikwibker@gmail.com', 'jannik', '3301fa8c21ce34e39846fe596a67469fb9c04e168b089bdb3b0f08ffd9d4ccfe', 'pnkBEKh7/Vug7mTLG9loEbl0DfO6b/sIAPPUJtxSYpSe0zQLlC3czGTkMLHyJr2I', 'admin'])
      .then(res => { console.log('[setup] inserting dummy user "jannik" successful') })
      .catch(err => { console.error('[setup] inserting dummy user "jannik" failed', err) })

    client.release()
  })