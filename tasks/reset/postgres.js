const { Pool } = require('pg')
const fs = require('fs')

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
  ssl: process.env.POSTGRES_USE_SSL === 'true' ? {
    rejectUnauthorized: false,
    ca: fs.readFileSync(process.env.POSTGRES_CA, 'utf8'),
    key: fs.readFileSync(process.env.POSTGRES_KEY, 'utf8'),
    cert: fs.readFileSync(process.env.POSTGRES_CERT, 'utf8')
  } : undefined
}

const pool = new Pool(config)

pool.on('error', (err) => {
  console.error('An idle client has experienced an error', err.stack)
})

module.exports = () => pool.connect()
  .then(async (client) => {

    console.log('[reset] removing all user entries from auth_user')

    await client.query('DELETE FROM auth_user;')
      .then(res => console.log('[reset] resetting users successful', res))
      .catch(err => console.error('[reset] resetting users failed', err))

    console.log('[reset] inserting dummy user "guest"')

    await client.query(INSERT_USER_QUERY, ['first', 'last', 'test@example.com', 'username', 'c42b78633724b8bb7da3bda18b87f3ff4802ca85af7c6418001d509cf220bc61', 'guest', 'default'])
      .then(res => console.log('[reset] inserting dummy user "guest" successful'))
      .catch(err => console.error('[reset] inserting dummy user "guest" failed', err))

    console.log('[reset] inserting dummy user "jannik"')

    await client.query(INSERT_USER_QUERY, ['Jannik', 'Wibker', 'jannikwibker@gmail.com', 'jannik', '3301fa8c21ce34e39846fe596a67469fb9c04e168b089bdb3b0f08ffd9d4ccfe', 'pnkBEKh7/Vug7mTLG9loEbl0DfO6b/sIAPPUJtxSYpSe0zQLlC3czGTkMLHyJr2I', 'admin'])
      .then(res => console.log('[reset] inserting dummy user "jannik" successful'))
      .catch(err => console.error('[reset] inserting dummy user "jannik" failed', err))

    client.release()
  })