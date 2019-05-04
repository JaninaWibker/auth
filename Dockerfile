FROM node:11

# package.json version
LABEL version="1.2.5"

ARG RESET_DATABASES

RUN apt-get update
RUN apt-get -yq install sqlite3 libsqlite3-dev
RUN npm i sqlite3 --build-from-source --sqlite=/usr

COPY . /app
WORKDIR /app

# resetting databases (created if they don't already exist) if RESET_DATABASES is set to true
RUN if [ "$RESET_DATABASES" = "true" ] ; then reset.sh ; else echo keeping databases as is ; fi

CMD node index.js
