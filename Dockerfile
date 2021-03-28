FROM node:15 as build

# TODO: what about the auth dashboard?

WORKDIR /auth

# copy files for npm install
COPY package.json      /auth/package.json
COPY package-lock.json /auth/package-lock.json

# install node modules
RUN npm install

# copy over rest of the files (exludes hidden files)
COPY . /auth

# copy over dotenv file # TODO: will dotenv be used?
COPY .env /auth/.env

RUN npm run build

FROM node:15

COPY --from=build /auth/dist /auth
COPY --from=build /auth/.env /auth/.env

WORKDIR /auth

CMD node index.js

