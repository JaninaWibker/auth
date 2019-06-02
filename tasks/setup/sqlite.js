const sqlite = require('sqlite')

const dbPromise = sqlite.open('./testing_users.sqlite')

const CREATE_TABLE_USER_QUERY = `
CREATE TABLE 'users' (
    'first_name' VARCHAR(64),
    'last_name' VARCHAR(64),
    'email' VARCHAR(256),
    'username' VARCHAR(128) NOT NULL,
    'password' VARCHAR(64) NOT NULL, -- sha256 hash of the plain-text password
    'salt' VARCHAR(64) NOT NULL,     -- salt that is appended to the password before it is hashed
    'creation_date' DATETIME NOT NULL DEFAULT CURRENT_DATETIME,
    'modification_date' DATETIME NOT NULL DEFAULT CURRENT_DATETIME,
    'account_type' VARCHAR(16) NOT NULL DEFAULT "default", -- account type can be: 'default', 'privileged', 'admin'
    'metadata' VARCHAR(1024) NOT NULL DEFAULT "{}", -- custom metadata that can be used in the future
    '2fa' BOOLEAN DEFAULT 0, -- whether 2 factor authentication is enabled or not
    '2fa_secret' VARCHAR(32) DEFAULT "", -- 2 factor authentication secret
    'passwordless' BOOLEAN DEFAULT 0,    -- whether a password is set initially or not, if not the password needs to be set when first logging in
    'temp_account' DATETIME DEFAULT 0    -- 0 for not a temporary account; date value for date the account expires. Upon expiring the account is disabled, deleted or has his account_type set to 'default'
);
`

const CREATE_TABLE_IP_QUERY = `
CREATE TABLE 'ip' (
  ip varchar(45) primary key, -- supports both ipv4 and ipv6 (ipv6 has a maximum length of 45 characters (https://stackoverflow.com/questions/1076714/max-length-for-client-ip-address/1076749))
  continent varchar(13) default 'None',   -- the longest continent names are North/South America which are both 13 characters long (following ISO-3166 continent names)
  continent_code varchar(2) default '--', -- following ISO-3166 continent codes
  country varchar(64),       -- 64 characters will probably be enough for every country (following ISO-3166 country names)
  country_code varchar(2),   -- following ISO-3166 country codes
  region varchar(64),
  region_code varchar(5),    -- should only be 2 characters but just incase make it 5 characters long
  city varchar(64),
  zip varchar(9),            -- normal zip code is 5 digits, but zip+4 code is 5 digits + hyphen + 4 digits
  latitude float default 0,  -- Hello there Null Island
  longitude float default 0, -- inhabitants, how's life?
  timezone varchar(32),
  timezone_code varchar(8),           -- not available on ipapi so can be null
  isp varchar(32),           -- internet service provider
  language varchar(16),               -- this is only a 16 character varchar, postgres uses an array of varchar(16), so this will only have the first language if one is available at all
  is_mobile boolean default 0,        -- not available on ipdata, will be set to false
  is_anonymous boolean default 0,     -- either using proxy or tor (tor cannot be detected by ipapi)
  is_threat boolean default 0,        -- not available on ipapi, will be set to false
  is_internal boolean default 0,      -- this is a flag that indicates that the IP address is a private IPv4, special purpose IPv4 (not globally routable), IPv6 link local unicast address or IPv6 unique local address
  creation_date datetime not null default current_datetime
)
`

const CREATE_TABLE_DEVICE_QUERY = `
CREATE TABLE 'device' (
  user_agent varchar(256),
  ip varchar(45),
  creation_date datetime not null default current_datetime,
  is_revoked boolean default 0,
  constraint fk_ip foreign key (ip) references ip(ip) on delete set null
)
`

const CREATE_TABLE_DEVICE_USER_INTERMEDIATE_TABLE_QUERY = `
CREATE TABLE 'it_device_user' (
  user_id integer,
  device_id integer,
  creation_date datetime default current_datetime,
  last_used datetime default current_datetime,
  primary key (user_id, device_id),
  constraint fk_user_id foreign key (user_id) references auth_user(rowid) on delete cascade,
  constraint fk_device_id foreign key (device_id) references device(rowid) on delete cascade
)
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

  console.log('[setup] if table device_user_it already exists, drop it')

  await db.run('DROP TABLE IF EXISTS it_device_user')
  
  console.log('[setup] if table users already exists, drop it')

  await db.run('DROP TABLE IF EXISTS users')

  console.log('[setup] if table device already exists, drop it')

  await db.run('DROP TABLE IF EXISTS device')

  console.log('[setup] if table ip already exists, drop it')

  await db.run('DROP TABLE IF EXISTS ip')

  console.log('[setup] creating ip table')

  await db.run(CREATE_TABLE_IP_QUERY)
    .then(res => console.log('[setup] creating ip table successful'))
    .catch(err => console.error('[setup] creating ip table failed', err))

  console.log('[setup] creating device table')

  await db.run(CREATE_TABLE_DEVICE_QUERY)
    .then(res => console.log('[setup] creating device table successful'))
    .catch(err => console.error('[setup] creating device table failed', err))

  
  console.log('[setup] creating users table')

  await db.run(CREATE_TABLE_USER_QUERY)
    .then(res => console.log('[setup] creating users table successful'))
    .catch(err => console.error('[setup] creating users table failed', err))

  console.log('[setup] creating it_device_user table')

  await db.run(CREATE_TABLE_DEVICE_USER_INTERMEDIATE_TABLE_QUERY)
    .then(res => console.log('[setup] creating it_device_user table successful'))
    .catch(err => console.error('[setup] creating it_device_user table failed', err))

  console.log('[setup] inserting dummy user "guest"')

  await db.run(INSERT_USER_QUERY, 'first', 'last', 'test@example.com', 'username', 'c42b78633724b8bb7da3bda18b87f3ff4802ca85af7c6418001d509cf220bc61', 'guest', 'default')
    .then(res => console.log('[setup] inserting dummy user "guest" successful'))
    .catch(err => console.error('[setup] inserting dummy user "guest" failed', err))

  console.log('[setup] inserting dummy user "jannik"')

  await db.run(INSERT_USER_QUERY, 'Jannik', 'Wibker', 'jannikwibker@gmail.com', 'jannik', '3301fa8c21ce34e39846fe596a67469fb9c04e168b089bdb3b0f08ffd9d4ccfe', 'pnkBEKh7/Vug7mTLG9loEbl0DfO6b/sIAPPUJtxSYpSe0zQLlC3czGTkMLHyJr2I', 'admin')
    .then(res => console.log('[setup] inserting dummy user "janniK" successful'))
    .catch(err => console.error('[setup] inserting dummy user "jannik" failed', err))
})