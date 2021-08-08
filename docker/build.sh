# build docker containers

cd ../dashboard
docker build -t auth-dashboard:0.0.1 -f ../docker/dashboard/Dockerfile .

cd ..
docker build -t auth-idp:0.0.1       -f docker/auth/Dockerfile .

cd docker
docker build -t auth-postgres:0.0.1  -f postgres/Dockerfile .

