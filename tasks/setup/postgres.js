const { Pool } = require('pg')
const fs = require('fs')

const CREATE_TABLE_USER_QUERY = `
DROP TYPE IF EXISTS account_type;
CREATE TYPE account_type AS ENUM ( 'admin', 'privileged', 'default' ); -- this is untested, may need some work
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
  account_type account_type NOT NULL DEFAULT 'default', -- this is untested, may need some work
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- custom metadata that can be used in the future
  twofa BOOLEAN DEFAULT false, -- whether 2 factor authentication is enabled or not
  twofa_secret VARCHAR(32) DEFAULT NULL, -- 2 factor authentication secret
  passwordless BOOLEAN DEFAULT false, -- whether a password is set initially or not, if not the password needs to be set when first logging in
  temp_account timestamptz DEFAULT to_timestamp(0) -- 0 for not a temporary account; date value for date the account expires. Upon expiring the account is disabled, deleted or has his account_type set to 'default'
);
`

const CREATE_TABLE_IP_QUERY = `
CREATE TABLE ip (
  ip varchar(45) primary key, -- supports both ipv4 and ipv6 (ipv6 has a maximum length of 45 characters (https://stackoverflow.com/questions/1076714/max-length-for-client-ip-address/1076749))
  continent varchar(13) default 'None', -- the longest continent names are North/South America which are both 13 characters long (following ISO-3166 continent names)
  continent_code varchar(2) default '--', -- following ISO-3166 continent codes
  country varchar(64), -- 64 characters will probably be enough for every country (following ISO-3166 country names)
  country_code varchar(2), -- following ISO-3166 country codes
  region varchar(64),
  region_code varchar(5), -- should only be 2 characters but just incase make it 5 characters long
  city varchar(64),
  zip varchar(9), -- normal zip code is 5 digits, but zip+4 code is 5 digits + hyphen + 4 digits
  latitude float default 0, -- Hello there Null Island
  longitude float default 0, -- inhabitants, how's life?
  timezone varchar(32),
  timezone_code varchar(8), -- not available on ipapi so can be null
  isp varchar(32), -- internet service provider
  language varchar(16)[], -- using an array here is probably super bad, but this allows having multiple languages; also not available on ipapi so can be null
  is_mobile boolean default false, -- not available on ipdata, will be set to false
  is_anonymous boolean default false, -- either using proxy or tor (tor cannot be detected by ipapi)
  is_threat boolean default false, -- not available on ipapi, will be set to false
  is_internal boolean default false, -- this is a flag that indicates that the IP address is a private IPv4, special purpose IPv4 (not globally routable), IPv6 link local unicast address or IPv6 unique local address
  creation_date timestamptz default current_timestamp
);
`

const CREATE_TABLE_DEVICE_QUERY = `
CREATE TABLE device (
  id uuid not null default uuid_generate_v1() primary key, -- UUID type: https://dba.stackexchange.com/questions/122623/default-value-for-uuid-column-in-postgres
  user_agent varchar(256),
  ip varchar(45) references ip(ip) on delete set null,
  creation_date timestamptz default current_timestamp
);
`

const CREATE_TABLE_DEVICE_USER_INTERMEDIATE_TABLE_QUERY = `
CREATE TABLE it_device_user (
  user_id integer references auth_user(id) on delete cascade,
  device_id uuid  references device(id)    on delete cascade,
  creation_date timestamptz default current_timestamp,
  last_used timestamptz default current_timestamp,
  is_revoked boolean default false,
  primary key (user_id, device_id)
)
`

const CREATE_TABLE_REGISTER_TOKEN_QUERY = `
CREATE TABLE registertoken (
  id serial primary key,
  created_at timestamptz not null,
  permanent boolean not null,
  expire_at timestamptz default to_timestamp(0),
  usage_count integer not null default 1, -- usage count of 0 means unlimited uses
  metadata jsonb default '{}'::jsonb,
  account_type account_type default 'default',
  token varchar(1536) not null
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
  $7::account_type, -- account_type
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

    console.log('[setup] enabling uuid-ossp pg_extension if not already enabled (this requires SUPER_USER, if the user specified inside the .env file does not have SUPER_USER permissions this will fail unless "uuid-ossp" is already installed. Having it already installed is preferred sicne this does not require giving the user SUPER_USER)')

    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    console.log('[setup] if table it_device_user already exists, drop it')

    await client.query('DROP TABLE IF EXISTS it_device_user')

    console.log('[setup] if table auth_user already exists, drop it')

    await client.query('DROP TABLE IF EXISTS auth_user')

    console.log('[setup] if table device already exists, drop it')

    await client.query('DROP TABLE IF EXISTS device')

    console.log('[setup] if table ip already exists, drop it')

    await client.query('DROP TABLE IF EXISTS ip')

    console.log('[setup] creating ip table')

    await client.query(CREATE_TABLE_IP_QUERY)
      .then(_res => { console.log('[setup] creating ip table successful') })
      .catch(err => { console.error('[setup] creating ip table failed', err) })

    console.log('[setup] creating device table')

    await client.query(CREATE_TABLE_DEVICE_QUERY)
      .then(_res => { console.log('[setup] creating device table successful') })
      .catch(err => { console.error('[setup] creating device table failed', err) })

    console.log('[setup] creating auth_user table')

    await client.query(CREATE_TABLE_USER_QUERY)
      .then(_res => { console.log('[setup] creating auth_user table successful') })
      .catch(err => { console.error('[setup] creating auth_user table failed', err) })

    console.log('[setup] creating it_device_user table')

    await client.query(CREATE_TABLE_DEVICE_USER_INTERMEDIATE_TABLE_QUERY)
      .then(_res => { console.log('[setup] creating it_device_user table successful') })
      .catch(err => { console.error('[setup] creating it_device_user table failed', err) })

    console.log('[setup] inserting dummy user "guest"')

    await client.query(INSERT_USER_QUERY, ['first', 'last', 'test@example.com', 'guest', 'c42b78633724b8bb7da3bda18b87f3ff4802ca85af7c6418001d509cf220bc61', 'guest', 'default'])
      .then(_res => { console.log('[setup] inserting dummy user "guest" successful') })
      .catch(err => { console.error('[setup] inserting dummy user "guest" failed', err) })

    console.log('[setup] inserting dummy user "jannik"')
    
    await client.query(INSERT_USER_QUERY, ['Jannik', 'Wibker', 'jannikwibker@gmail.com', 'jannik', '3301fa8c21ce34e39846fe596a67469fb9c04e168b089bdb3b0f08ffd9d4ccfe', 'pnkBEKh7/Vug7mTLG9loEbl0DfO6b/sIAPPUJtxSYpSe0zQLlC3czGTkMLHyJr2I', 'admin'])
      .then(_res => { console.log('[setup] inserting dummy user "jannik" successful') })
      .catch(err => { console.error('[setup] inserting dummy user "jannik" failed', err) })

    await client.release()

    await pool.end()
  })