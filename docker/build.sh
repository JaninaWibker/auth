#!/usr/bin/env bash

# colors
BOLD='\033[1m'
RESET='\033[0m'
PINK='\033[0;35m'
BLUE='\033[0;34m'
WHITE='\033[0;37m'
RED='\033[0;31m'
YELLOW='\033[0;32m'

# settings
PRIV_KEY_LOCATION="../sensitive/ec-secp256k1-priv-key.pem"
PUB_KEY_LOCATION="../sensitive/ec-secp256k1-pub-key.pem"
POSTGRES_PW_LOCATION="../sensitive/postgres_password.txt"

function error_occurred() {
  echo "${BOLD}{$RED}something went wrong, exiting"
  exit
}

# generate sql statements for creating users from a csv file (excludes header; username, email (optional), password, role)
function create_user() {
  OLDIFS=$IFS
  IFS=","
  {
    read
    while read -r username email password role
    do
      salt=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 16 ; echo)
      password=$(echo -n $password$salt | openssl dgst -sha256)
      [ -z "$email" ] && email=NULL || email="'$email'"

      echo -e "\
INSERT INTO auth_user (\n\
  username, email, password, salt, role_id\n\
) VALUES (\n\
  '$username', $email, '$password', '$salt', '$role'\n\
);"
    done
  } < $1
  IFS=$OLDIFS
}

# use $1 to generate sql statements and replace them in the file specified by $2
function replace_in_file() {
  replacement=$(create_user $1)
  perl -0777 -i -pe "s/(-- %START USER ACCOUNT SECTION%\\n).*(\\n-- %END USER ACCOUNT SECTION)/\$1$replacement\$2/s" $2
}

echo -e "${PINK}${BOLD}[1]${WHITE}${BOLD} generating sql statements from users.csv file${RESET}"

replace_in_file users.csv postgres/init.sql

# create folder for public/private keys and postgres password if it doesn't already exist
mkdir ../sensitive &> /dev/null

echo -e "${PINK}${BOLD}[2]${WHITE}${BOLD} generating docker images${RESET}"

echo -e "${BLUE}${BOLD}-${RESET}${BLUE} generating auth-dashboard image ${RESET}(auth-dashboard:0.0.1; required by auth-idp)${RESET}"

cd ../dashboard
docker build -t auth-dashboard:0.0.1 -f ../docker/dashboard/Dockerfile . || error_occurred

echo -e "${BLUE}${BOLD}-${RESET}${BLUE} generating auth image ${RESET}(auth-idp:0.0.1)${RESET}"

cd ..
docker build -t auth-idp:0.0.1 -f docker/auth/Dockerfile . || error_occurred

echo -e "${BLUE}${BOLD}-${RESET}${BLUE} generating postgres image ${RESET}(auth-postgres:0.0.1)${RESET}"

cd docker
docker build -t auth-postgres:0.0.1 -f postgres/Dockerfile . || error_occurred




echo -e "${PINK}${BOLD}[3]${WHITE}${BOLD} generating docker secrets${RESET}"

echo -e "${BLUE}${BOLD}-${RESET}${BLUE} generating public/private key pair ${RESET}(can be found at ${YELLOW}\"${PRIV_KEY_LOCATION}\"${RESET} & ${YELLOW}\"${PUB_KEY_LOCATION}\"${RESET})${RESET}"

openssl ecparam -name secp256k1 -genkey -noout -out $PRIV_KEY_LOCATION &> /dev/null
openssl ec -in $PRIV_KEY_LOCATION -pubout > $PUB_KEY_LOCATION &> /dev/null

echo -e "${BLUE}${BOLD}-${RESET}${BLUE} generating postgres password ${RESET}(can be found at ${YELLOW}\"${POSTGRES_PW_LOCATION}\"${RESET})${RESET}"

# taken from https://unix.stackexchange.com/a/230676 and modified slightly
password=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 16 ; echo)

echo -n $password > $POSTGRES_PW_LOCATION
