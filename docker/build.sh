# build docker containers

# TODO: generate proper public/private key pair (ecdsa) and put them in 'certs/auth/ec-secp256k1-pub-key.pem' and 'certs/auth/ec-secp256k1-priv-key.pem'
# TODO: generate postgres password and put it in 'postgres_password.txt'

cd ../dashboard
docker build -t auth-dashboard:0.0.1 -f ../docker/dashboard/Dockerfile .

cd ..
docker build -t auth-idp:0.0.1       -f docker/auth/Dockerfile .

cd docker
docker build -t auth-postgres:0.0.1  -f postgres/Dockerfile .

