FROM node:15

# TODO: this needs to find the dashboard somewhere first

WORKDIR /dashboard

# copy files for npm install
COPY package.json      /dashboard/package.json
COPY package-lock.json /dashboard/package-lock.json

# install node modules
RUN npm install

# copy over rest of the files (exludes hidden files)
COPY . /dashboard

# copy over dotenv file # TODO: will dotenv be used?
# COPY .env /dashboard/.env

RUN SKIP_PREFLIGHT_CHECK=true npm run build
