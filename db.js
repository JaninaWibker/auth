if(process.env.DB_DRIVER === 'postgres') {
  const postgres_adapter = require('./adapters/postgres.js')
  module.exports = postgres_adapter
} else if(process.env.DB_DRIVER === 'sqlite' || !process.env.DB_DRIVER) {
  // default option incase nothing is configured
  const sqlite_adapter = require('./adapters/sqlite.js')
  module.exports = sqlite_adapter
}