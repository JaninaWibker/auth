const config = require('dotenv').config().parsed

console.log('[reset] starting')

if(config.DB_DRIVER && config.DB_DRIVER.toLowerCase() === 'postgres') {
  console.log('[reset] using postgres as database driver')
  require('./reset/postgres.js')()
    .then(() => console.log('[reset] if the above did not error, reset was successful'))
} else if(config.DB_DRIVER && config.DB_DRIVER.toLowerCase() === 'sqlite' || config.DB_DRIVER) {
  console.log('[reset] using sqlite as database driver')
  require('./reset/sqlite.js')()
    .then(() => console.log('[reset] if the above did not error, reset was successful'))
}