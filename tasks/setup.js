const config = require('dotenv').config().parsed

console.log('[setup] starting')

if(config.DB_DRIVER && config.DB_DRIVER.toLowerCase() === 'postgres') {
  console.log('[setup] using postgres as database driver')
  require('./setup/postgres.js')()
    .then(() => console.log('[setup] if the above did not error, setup was successful'))
} else if(config.DB_DRIVER && config.DB_DRIVER.toLowerCase() === 'sqlite' || config.DB_DRIVER) {
  console.log('[setup] using sqlite as database driver')
  require('./setup/sqlite.js')()
    .then(() => console.log('[setup] if the above did not error, setup was successful'))
}

