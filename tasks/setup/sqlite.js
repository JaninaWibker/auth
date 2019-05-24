const sqlite = require('sqlite')

const dbPromise = sqlite.open('./testing_users.sqlite')

const CREATE_TABLE_QUERY = `
CREATE TABLE 'users' (
    'first_name' VARCHAR(64),
    'last_name' VARCHAR(64),
    'email' VARCHAR(256),
    'username' VARCHAR(128) NOT NULL,
    'password' VARCHAR(64) NOT NULL, -- sha256 hash of the plain-text password
    'salt' VARCHAR(64) NOT NULL, -- salt that is appended to the password before it is hashed
    'creation_date' DATETIME NOT NULL DEFAULT CURRENT_DATETIME,
    'modification_date' DATETIME NOT NULL DEFAULT CURRENT_DATETIME,
    'account_type' VARCHAR(16) NOT NULL DEFAULT "default", -- account type can be: 'default', 'privileged', 'admin'
    'metadata' VARCHAR(1024) NOT NULL DEFAULT "{}", -- custom metadata that can be used in the future
    '2fa' BOOLEAN DEFAULT 0, -- whether 2 factor authentication is enabled or not
    '2fa_secret' VARCHAR(32) DEFAULT "", -- 2 factor authentication secret
    'passwordless' BOOLEAN DEFAULT 0, -- whether a password is set initially or not, if not the password needs to be set when first logging in
    'temp_account' DATETIME DEFAULT 0 -- 0 for not a temporary account; date value for date the account expires. Upon expiring the account is disabled, deleted or has his account_type set to 'default'
);
`

const INSERT_USER_QUERY = `
INSERT INTO 'users' VALUES (
  ?, -- first_name
  ?, -- last_name
  ?, -- email
  ?, -- username
  ?, -- (hashed) password
  ?, -- salt
  datetime('now'), -- creation_date
  datetime('now'), -- modification_date
  ?, -- account_type
  "{}", -- metadata
  0, -- 2fa
  "", -- 2fa_secret
  0, -- passwordless
  0 -- temp_account
)
`

module.exports = () => dbPromise.then(async db => {
  
  console.log('[setup] if table user already exists, drop it')

  await db.run('DROP TABLE IF EXISTS user')

  console.log('[setup] creating user table')

  await db.run(CREATE_TABLE_QUERY)
    .then(res => console.log('[setup] creating user table successful'))
    .catch(err => console.error('[setup] creating user table failed', err))

  console.log('[setup] inserting dummy user "guest"')

  await db.run(INSERT_USER_QUERY, 'first', 'last', 'test@example.com', 'username', 'c42b78633724b8bb7da3bda18b87f3ff4802ca85af7c6418001d509cf220bc61', 'guest', 'default')
    .then(res => console.log('[setup] inserting dummy user "guest" successful'))
    .catch(err => console.error('[setup] inserting dummy user "guest" failed', err))

  console.log('[setup] inserting dummy user "jannik"')

  await db.run(INSERT_USER_QUERY, 'Jannik', 'Wibker', 'jannikwibker@gmail.com', 'jannik', '3301fa8c21ce34e39846fe596a67469fb9c04e168b089bdb3b0f08ffd9d4ccfe', 'pnkBEKh7/Vug7mTLG9loEbl0DfO6b/sIAPPUJtxSYpSe0zQLlC3czGTkMLHyJr2I', 'admin')
    .then(res => console.log('[setup] inserting dummy user "janniK" successful'))
    .catch(err => console.error('[setup] inserting dummy user "jannik" failed', err))
})