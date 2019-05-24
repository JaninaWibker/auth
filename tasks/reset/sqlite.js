const sqlite = require('sqlite')

const dbPromise = sqlite.open('./testing_users.sqlite')

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

  console.log('[reset] removing all user entries from user')

  await db.run('DELETE FROM users;')
    .then(res => console.log('[reset] resetting users successful', res))
    .catch(err => console.error('[reset] resetting users failed', err))

  console.log('[setup] inserting dummy user "guest"')

  await db.run(INSERT_USER_QUERY, 'first', 'last', 'test@example.com', 'username', 'c42b78633724b8bb7da3bda18b87f3ff4802ca85af7c6418001d509cf220bc61', 'guest', 'default')
    .then(res => console.log('[setup] inserting dummy user "guest" successful'))
    .catch(err => console.error('[setup] inserting dummy user "guest" failed', err))

  console.log('[setup] inserting dummy user "jannik"')

  await db.run(INSERT_USER_QUERY, 'Jannik', 'Wibker', 'jannikwibker@gmail.com', 'jannik', '3301fa8c21ce34e39846fe596a67469fb9c04e168b089bdb3b0f08ffd9d4ccfe', 'pnkBEKh7/Vug7mTLG9loEbl0DfO6b/sIAPPUJtxSYpSe0zQLlC3czGTkMLHyJr2I', 'admin')
    .then(res => console.log('[setup] inserting dummy user "janniK" successful'))
    .catch(err => console.error('[setup] inserting dummy user "jannik" failed', err))
})