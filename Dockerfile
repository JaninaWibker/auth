FROM node:11
COPY . /app
WORKDIR /app
RUN apt-get update
RUN apt-get -yq install sqlite3 libsqlite3-dev
RUN npm i sqlite3 --build-from-source --sqlite=/usr
CMD node index.js
