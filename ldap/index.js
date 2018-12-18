const ldap = require('ldapjs')

const addUser = require('./add.js')
const modifyUser = require('./modify.js')
const deleteUser = require('./delete.js')
const getUser = require('./get.js')
const authenticateUser = require('./authenticate.js')

const server = ldap.createServer()

server.add('ou=users, o=myhost', addUser(ldap, server))

server.modify('ou=users, o=myhost', modifyUser(ldap, server))

server.del('ou=users, o=myhost', deleteUser(ldap, server))

server.search('ou=users, o=myhost', getUser(ldap, server))

server.bind('cn=root', authenticateUser(ldap, server))

module.exports = {
  listen: (port, cb) => server.listen(port || 1389, '127.0.0.1', () => cb(server.url))
}