-- creating database and role

CREATE ROLE auth WITH LOGIN PASSWORD '{auth_password}';

CREATE DATABASE auth OWNER auth;

\c auth;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- creating tables

CREATE TABLE auth_group (
  id    VARCHAR(64) PRIMARY KEY,    -- a unique id for the group; must be lowercase, otherwise like identifiers used elsewehre but with dashes ('-') allowed
  name  VARCHAR(64) UNIQUE NOT NULL -- a pretty printed name for the group; no restrictions on characters or anything of that sort
);

CREATE TABLE auth_role (
  id    VARCHAR(64) PRIMARY KEY,    -- a unique id for the role; must be lowercase, otherwise like identifiers used elsewhere but with dashes ('-') allowed
  name  VARCHAR(64) UNIQUE NOT NULL -- a pretty printed name for the role; no restriction on characters or anything of that sort
);

CREATE TABLE auth_user (
  id                UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  username          VARCHAR(128) UNIQUE NOT NULL,
  fullname          VARCHAR(256), -- can be null if no name is every specified; shouldn't be split up into first and last name because the concept of first/last names differs around the world
  email             VARCHAR(256) NOT NULL,
  password          VARCHAR(128) NOT NULL, -- sha256 hash of the plain-text password
  salt              VARCHAR(64) NOT NULL,  -- salt that is appended to the password before it is hashed
  creation_date     TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
  modification_date TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb, -- custom metadata that can be used in the future
  disabled          BOOLEAN NOT NULL DEFAULT false,    -- wether or not the account is currently disabled
  mfa               BOOLEAN NOT NULL DEFAULT false,    -- wether or not 2fa is enabled (called mfa (multi-factor-authentication) because must start with letters)
  mfa_secret        VARCHAR(32) DEFAULT NULL,          -- 2fa authentication secret
  passwordless      BOOLEAN NOT NULL DEFAULT false,    -- wether or not a password is initially set; if not the password needs to be set when first login attempt happens
  temp_account      TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0), -- 0 for non-temporary accounts; non-zero values for temporary accounts which expire at a certain time (the timestamp is the time it expires)
  role_id           VARCHAR(64) NOT NULL DEFAULT 'default' REFERENCES auth_role(id)
);

-- CREATE TABLE auth_ip (

-- );

CREATE TABLE auth_device (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  useragent VARCHAR(256),
  ip VARCHAR(39) NOT NULL, -- 39 characters is the maximal length of an IPv6 address
  creation_date TIMESTAMPTZ DEFAULT current_timestamp
);

-- CREATE TABLE auth_permission (   -- printed as '<scope>:<name>' (e.g. 'users:modify'); for nested scopes use dots ('.') (e.g. 'auth.users:modify')
--   scope VARCHAR(64) PRIMARY KEY, -- scope for which the permission applies (e.g. 'users')
--   name  VARCHAR(64) PRIMARY KEY  -- exact name of the permission for the scope (e.g. 'modify')
-- );

CREATE TABLE auth_it_user_permission (
  user_id           UUID REFERENCES auth_user(id) ON DELETE CASCADE,
  permission_scope  VARCHAR(64),
  permission_name   VARCHAR(64),
  PRIMARY KEY(user_id, permission_scope, permission_name)
);

CREATE TABLE auth_it_user_group (
  user_id   UUID        REFERENCES auth_user(id)  ON DELETE CASCADE,
  group_id  VARCHAR(64) REFERENCES auth_group(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, group_id)
);

CREATE TABLE auth_it_role_permission (
  role_id           VARCHAR(64) REFERENCES auth_role(id) ON DELETE CASCADE,
  permission_scope  VARCHAR(64),
  permission_name   VARCHAR(64),
  PRIMARY KEY(role_id, permission_scope, permission_name)
);

CREATE TABLE auth_it_group_permission (
  group_id          VARCHAR(64) REFERENCES auth_group(id) ON DELETE CASCADE,
  permission_scope  VARCHAR(64),
  permission_name   VARCHAR(64),
  PRIMARY KEY(group_id, permission_scope, permission_name)
);

CREATE TABLE auth_it_user_device (
  user_id   UUID REFERENCES auth_user(id) ON DELETE CASCADE,
  device_id UUID REFERENCES auth_device(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, device_id)
);


-- views

CREATE VIEW auth_user_role_group AS
SELECT A.*, B.name as role_name, C.id as group_id, C.name as group_name FROM auth_user A
LEFT JOIN auth_role B on B.id = A.role_id
LEFT JOIN auth_it_user_group it_C ON it_C.user_id = A.id
LEFT JOIN auth_group C ON it_C.group_id = C.id;

CREATE VIEW auth_user_all AS
SELECT A.*, B.name as role_name, C.id as group_id, C.name as group_name, p_B.permission_scope as role_permission_scope, p_B.permission_name as role_permission_name, p_C.permission_scope as group_permission_scope, p_C.permission_name as group_permission_name FROM auth_user A
LEFT JOIN auth_role B on B.id = A.role_id
LEFT JOIN auth_it_user_group it_C ON it_C.user_id = A.id
LEFT JOIN auth_group C ON it_C.group_id = C.id
LEFT JOIN auth_it_role_permission p_B ON p_B.role_id = B.id
LEFT JOIN auth_it_group_permission p_C ON p_C.group_id = C.id;

CREATE VIEW role_permission AS
SELECT A.*, B.permission_scope as permission_scope, B.permission_name as permission_name FROM auth_role A
LEFT JOIN auth_it_role_permission B ON A.id = B.role_id;

CREATE VIEW group_permission AS
SELECT A.*, B.permission_scope as permission_scope, B.permission_name as permission_name FROM auth_group A
LEFT JOIN auth_it_group_permission B ON A.id = B.group_id;


-- inserting data

INSERT INTO auth_role ( id, name ) VALUES ( 'admin', 'Administrator' );
INSERT INTO auth_role ( id, name ) VALUES ( 'default', 'Default' );

INSERT INTO auth_it_role_permission ( role_id, permission_scope, permission_name ) VALUES ( 'admin', 'auth.config', '*' );
INSERT INTO auth_it_role_permission ( role_id, permission_scope, permission_name ) VALUES ( 'admin', 'auth.device', '*' );
INSERT INTO auth_it_role_permission ( role_id, permission_scope, permission_name ) VALUES ( 'admin', 'auth.group',  '*' );
INSERT INTO auth_it_role_permission ( role_id, permission_scope, permission_name ) VALUES ( 'admin', 'auth.role',   '*' );
INSERT INTO auth_it_role_permission ( role_id, permission_scope, permission_name ) VALUES ( 'admin', 'auth.user',   '*' );

INSERT INTO auth_it_role_permission ( role_id, permission_scope, permission_name ) VALUES ( 'default', 'auth.user', 'modify-self'        );
INSERT INTO auth_it_role_permission ( role_id, permission_scope, permission_name ) VALUES ( 'default', 'auth.user', 'delete-own-account' );
INSERT INTO auth_it_role_permission ( role_id, permission_scope, permission_name ) VALUES ( 'default', 'auth.user', 'change-password'    );

-- %START USER ACCOUNT SECTION%
INSERT INTO auth_user (
  username, email, password, salt, role_id
) VALUES (
  'jannik', NULL, '612e4e53fa32b3bf675f5541d5a1fed84d600c219008e8ab853ad7d5e041e7ee', 'vpcOwHltF4Jyu3oV', 'admin'
);
INSERT INTO auth_user (
  username, email, password, salt, role_id
) VALUES (
  'test', NULL, '7d8f7f7227472ccd275db1750b3e128efad7e51598ce37adb0c565a987abe7ad', 'sTw2GVNrFnYLHFOs', 'default'
);
-- %END USER ACCOUNT SECTION%

-- grant auth user proper permissions

GRANT ALL PRIVILEGES ON DATABASE auth TO auth;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO auth;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO auth;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO auth;
