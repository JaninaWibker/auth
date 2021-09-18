FROM auth-dashboard:0.0.1 as build_dashboard

FROM node:15 as build_auth

WORKDIR /auth

# copy files for npm install
COPY package.json      /auth/package.json
COPY package-lock.json /auth/package-lock.json

# install node modules
RUN npm install

# copy over rest of the files (excludes hidden files and node_modules)
COPY . /auth

# copy over dotenv file # TODO: will dotenv be used?
COPY .env.prod /auth/.env


RUN npm run build

FROM node:15

# copy over build of dashboard
COPY --from=build_dashboard /dashboard/build /auth/static/

# copy over build of auth
COPY --from=build_auth /auth/             /auth/
COPY --from=build_auth /auth/.env         /auth/.env
COPY --from=build_auth /auth/package.json /auth/package.json
COPY --from=build_auth /auth/node_modules /auth/node_modules

WORKDIR /auth

# run auth
CMD node dist/index.js
