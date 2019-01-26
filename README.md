# auth

**auth** is a selfmade authentication server that works with many of my other running projects. It provides a central account for all services.
The authentication server and the other services using it rely on server-to-server communication as well as Json Web Tokens for authentication.

*auth* is planned to have a ldap frontend as well as the already existing one, which would allow *auth* to be used for many more services such as private git servers.


## How to setup

after downloading run 

```sh
npm install
```

and follow the following steps.

### .env file

*auth* is configured using a `.env`-file. This file has to contain these things:

```sh
SECRET="<SECRET>"
PORT=<PORT>
ENABLE_LDAP=true|false
LDAP_PORT=<PORT>
```

the `SECRET` is used for server-to-server communication and all servers that want to use *auth* as their account/authentication server must know this and use it.

the `PORT` and `LDAP_PORT` options are pretty selfexplainatory. They specify what ports should be used. Note that this LDAP endpoint is not working at the time of writing this.

`ENABLE_LDAP` enables or disables the LDAP server. LDAP is not fully implementet at the time of writing and cannot be used for authentication **yet**. This will come in the future but may take a little bit of time until it is implemented completely. This option, aswell as `LDAP_PORT`, is just for future proofing the running installation of *auth*. When LDAP is available it should not be necessary to change the file, when it is configured correctly now.

### database

*auth* currently uses sqlite as it's database. But this can easily be changed and when needed will be changed in the future.

To get started the database needs to be created. This is done using the `reset.sh`-script. It will drop existing tables from Users.sqlite and recreate them. This script is for resetting the user database, meaning that when running warnings about tables not existing will show up. This is the expected behaviour.

When you want to reset the user database you also have to use the `reset.sh`-script. It will drop the existing tables and recreate them.

```sh
sh reset.sh
```

### private/public rsa key pairs

*auth* relies on RSA private/public key encryption to authenticate users and services. For this purpose an rsa key pair needs to be generated.

The private key needs to be stored in `private.key` and the public key in `public.key`. Both need to be in the [PEM format](https://www.cryptosys.net/pki/rsakeyformats.html).

To generate a private/public rsa key pair you can use [openssl](https://www.openssl.org/).

This generates a key pair and puts it into **a single file** (`private.key`). A *bit length* of 2048 or 4096 is recommended.

```sh
openssl genrsa -out private.key <bit length (512/1024/2048/4096/...)>
```

This extracts the public key part from the previously generated file and puts it into ``. Online you will probably find that the public key is derived from the private key, **this is wrong**, the public key is embedded inside the private key file but **cannot ever** be derived from the real rsa private key. Openssl just puts both keys (or rather the numbers to calculate both of them) into a single file.

Extracting the public key into its own file is necessary:

```sh
openssl rsa -in private.key -outform PEM -pubout -out public.key
```

## How to run

Running is pretty simple. Just execute the `index.js`-file.

```sh
node index.js
```

> remember to run `npm install`.