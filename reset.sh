echo "
DROP TABLE 'users';
CREATE TABLE 'users' (
    'first_name' VARCHAR(64),
    'last_name' VARCHAR(64),
    'email' VARCHAR(256),
    'username' VARCHAR(128) NOT NULL,
    'password' VARCHAR(64) NOT NULL, -- sha256 hash of the plain-text password
    'salt' VARCHAR(64) NOT NULL, -- salt that is appended to the password before it is hashed
    'creation_date' DATETIME NOT NULL DEFAULT CURRENT_DATETIME,
    'modification_date' DATETIME NOT NULL DEFAULT CURRENT_DATETIME,
    'account_type' VARCHAR(16) NOT NULL DEFAULT \"default\", -- account type can be: 'default', 'privileged', 'admin'
    'metadata' VARCHAR(1024) NOT NULL DEFAULT \"{}\", -- custom metadata that can be used in the future
    '2fa' BOOLEAN DEFAULT 0, -- wether 2 factor authentication is enabled or not
    '2fa_secret' VARCHAR(32) DEFAULT \"\", -- 2 factor authentication secret
    'temp_account' DATETIME DEFAULT 0 -- 0 for not a temporary account; date value for date the account expires. Upon expiring the account is disabled, deleted or has his account_type set to 'default'
);
" | sqlite3 Users.sqlite

# insert guest account into table
echo "
INSERT INTO 'users' VALUES (
  \"first\",
  \"last\",
  \"test@example.com\",
  \"guest\",
  \"c42b78633724b8bb7da3bda18b87f3ff4802ca85af7c6418001d509cf220bc61\",
  \"guest\",
  datetime('now'),
  datetime('now'),
  \"default\",
  \"{}\",
  0,
  \"\"
);
INSERT INTO 'users' VALUES (
  \"Jannik\",
  \"Wibker\",
  \"jannikwibker@gmail.com\",
  \"jannik\",
  \"3301fa8c21ce34e39846fe596a67469fb9c04e168b089bdb3b0f08ffd9d4ccfe\",
  \"pnkBEKh7/Vug7mTLG9loEbl0DfO6b/sIAPPUJtxSYpSe0zQLlC3czGTkMLHyJr2I\",
  datetime('now'),
  datetime('now'),
  \"admin\",
  \"{}\",
  0,
  \"\"
);
" | sqlite3 Users.sqlite