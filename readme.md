# auth (v2)

> some quick notes (this will turn into a proper readme soon™)

generate keys using the following:
```sh
openssl ecparam -name secp256k1 -genkey -noout -out ec-secp256k1-priv-key.pem
openssl ec -in ec-secp256k1-priv-key.pem -pubout > ec-secp256k1-pub-key.pem
```

(source: https://learn.akamai.com/en-us/webhelp/iot/jwt-access-control/GUID-C3B1D111-E0B5-4B3B-9FF0-06D48CF40679.html)

build the docker containers using the build.sh script in the docker folder

for local development run `docker-compose up -d database` (docker directory) and `npm run start` (root directory)

for actual deployment run `docker-compose up -d` in the docker directory
