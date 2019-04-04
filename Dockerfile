FROM node:11
COPY . /app
WORKDIR "/app"
RUN apt-get install sqlite3
RUN npm i
CMD node index.js
