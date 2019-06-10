FROM node:11

# package.json version
LABEL version="1.4.1"

ARG RESET_DATABASES
ARG DB="postgres"

RUN if [ "$DB" = "sqlite" ] ; then apt-get update ; fi
RUN if [ "$DB" = "sqlite" ] ; then apt-get -yq install sqlite3 libsqlite3-dev ; fi

COPY . /app
WORKDIR /app

RUN if [ "$DB" = "sqlite" ] ; then npm i sqlite3 --build-from-source --sqlite=/usr ; fi
RUN if [ "$DB" = "postgres" ] ; then npm uninstall sqlite3 sqlite --save ; fi
RUN if [ "$DB" = "postgres" ] ; then npm install ; fi

# resetting databases (created if they don't already exist) if RESET_DATABASES is set to true
RUN if [ "$RESET_DATABASES" = "true" ] ; then node tasks/setup.js ; fi

CMD node index.js
