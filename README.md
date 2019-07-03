# auth

**auth** is a selfmade authentication server that works with many of my other running projects. It provides a central account for all services.
The authentication server and the other services using it rely on server-to-server communication as well as JWTs for authentication.

*auth* is planned to have a ldap frontend as well as the already existing one, which would allow *auth* to be used for many more services such as private git servers.


## How to setup

after downloading run 

```sh
npm install
```

and follow the following steps.

### .env file

*auth* is configured using a `.env`-file. This file should contain these things:

```sh
SECRET="<SECRET>"
PORT=<PORT>
ENABLE_LDAP=<true / false>
LDAP_PORT=<PORT>
ANALYTICS_SERVER="<analytics server address>"
IP_LOOKUP_ENDPOINT="<ip lookup api endpoint (if left blank ip-lookup is disabled)>"
IP_LOOKUP_SECRET="<your ip lookup secret>"
DB_DRIVER="<postgres / sqlite>"
POSTGRES_SERVER="<postgres database address>"
POSTGRES_PORT=5432
POSTGRES_USER="<postgres username>"
POSTGRES_PASSWORD="<postgres password>"
POSTGRES_USE_SSL=<true / false>
# if POSTGRES_USE_SSL is false this can be omitted
POSTGRES_CERT="certs/postgres/client.crt" # generating certificates may be required
POSTGRES_KEY="certs/postgres/private.key" # depending on the database server configuration
POSTGRES_CA="certs/postgres/root.crt"    
```

> Use the `.env.example`-file as a reference

the `SECRET` is used for server-to-server communication and all servers that want to use *auth* as their account/authentication server must know this and use it.

the `PORT` and `LDAP_PORT` options are pretty selfexplainatory. They specify what ports should be used. Note that this LDAP endpoint is not working at the time of writing this.

`ENABLE_LDAP` enables or disables the LDAP server. LDAP is not fully implementet at the time of writing and cannot be used for authentication **yet**. This will come in the future but may take a little bit of time until it is implemented completely. This option, aswell as `LDAP_PORT`, is just for future proofing the running installation of *auth*. When LDAP is available it should not be necessary to change the file, when it is configured correctly now.

### database

*auth* can either use sqlite or postgres as it's database. This is configurable via the `DB_DRIVER`-option in the `.env`-file.

To get started the database has to be initialized. This can be done through the `tasks/setup.js`-file. This file will run the required setup process for the current database driver. When using postgres an important detail is that the extension `"uuid-ossp"` is required for using auth. Since the database user that auth uses is probably not permitted to install extensions this needs to be done prior via this SQL statement:

```sql
create extension if not exists "uuid-ossp";
```

With that done the database can be initialized using `node tasks/setup.js`. 

When running for the first time there might be some warnings about tables not existing, this can be ignored. After the first time these should not come up anymore.

> The script tries to drop tables that do not exist yet and displays a warning.


Resetting the database (deleting all entries, not dropping the tables) can be done via `node tasks/reset.js`

### private/public rsa key pairs

*auth* relies on RSA private/public key encryption to authenticate users and services. For this purpose an rsa key pair needs to be generated.

The private key needs to be stored in `private.key` and the public key in `public.key`. Both need to be in the [PEM format](https://www.cryptosys.net/pki/rsakeyformats.html).

To generate a private/public rsa key pair you can use [openssl](https://www.openssl.org/).

This generates a key pair and puts it into **a single file** (`private.key`). A *bit length* of 2048 or 4096 is recommended.

```sh
openssl genrsa -out private.key <bit length (512/1024/2048/4096/...)>
```

This extracts the public key part from the previously generated file and puts it into `private.key`. Online you will probably find that the public key is derived from the private key, **this is wrong**, the public key is embedded inside the private key file but **cannot ever** be derived from the real rsa private key. Openssl just puts both keys (or rather the numbers to calculate both of them) into a single file.

Extracting the public key into its own file is necessary:

```sh
openssl rsa -in private.key -outform PEM -pubout -out public.key
```

### Other services

*auth* interacts with some other services such as [ip-lookup](https://git.jannik.ml/jannik/ip-lookup) and [analytics](https://git.jannik.ml/jannik/analytics-server). These other services are not necessarily required but nice to have. *ip-lookup* is a service for gathering metadata about ip addresses such as geolocation and isp. This is used for the *Devices API*. *analytics* is a service for collecting analytics data. Events such as logins and errors are sent to it for later analysis. 

## How to run

Running is pretty simple. Just execute the `index.js`-file.

```sh
node index.js
```

> remember to run `npm install` before.

## Using auth

*auth* can either be used as a **kind of** OAuth Login Provider or directly via the APIs. 

API documentation can be found [here](/documentation/index.md).
Incase you are using [Insomnia](https://insomnia.rest) as your REST client, you can import the API definitions (only auth) directly ([API definitions](/documentation/Insomnia-auth.json)). If you also need the API definitions for ip-lookup and analytics aswell use [this file](/documentation/Insomnia-all.json) instead.