if(process.env.DB_DRIVER && process.env.DB_DRIVER.toLowerCase() === 'postgres') {
  const postgres_adapter = require('./database-adapters/postgres.js')
  module.exports = postgres_adapter
} else if(process.env.DB_DRIVER && process.env.DB_DRIVER.toLowerCase() === 'sqlite' || !process.env.DB_DRIVER) {
  // default option incase nothing is configured
  const sqlite_adapter = require('./database-adapters/sqlite.js')
  module.exports = sqlite_adapter
}