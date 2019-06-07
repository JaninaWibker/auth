#!/usr/bin/env node
'use strict';
const config = require('dotenv').config().parsed
const db = require('./db')
const arg = require('arg')

const { version } = require('./package.json')

const args = arg({
  '--help': Boolean,
  '--version': Boolean,
  '--id': String,
  '--username': String,
  '--email': String
}, {
  argv: process.argv.slice(2),
  permissive: true
})

if((args._.length === 0 && Object.keys(args).length === 1) || args['--help']) {
  console.log(`
authcli add-account <username> <first_name> <last_name> <email> <password>
authcli remove-account --id <id> --username <username> --email <email>
authcli modify-account --id <id> --username <username> --email <email> set <field> <value>
authcli get-account --id <id> --username <username> --email <email>
authcli list-accounts
  `)
} else if(args['--version']) {
  console.log('auth service version ' + version)
} else if(args._[0] === 'add-account') {
  if(args._.length >= 6) {
    const [username, first_name, last_name, email, password, account_type='default', is_passwordless=false, temp_account=0] = args._.slice(1, 6)
    console.log(`adding account with\n\tusername:\t"${username}",\n\tpassword:\t"${password}",\n\tfirst_name:\t"${first_name}",\n\tlast_name:\t"${last_name}",\n\temail:\t\t"${email}",\n\taccount_type:\t\t"${account_type}",\n\tis_passwordless:\t\t"${is_passwordless}",\n\ttemp_account:\t\t"${temp_account}"`)
    db.addUser(username, password, first_name, last_name, email, 'default', {}, is_passwordless, temp_account, console.log).then(db.terminate)
  } else {
    console.log('error, too few arguments:\nauthcli add-account <username> <first_name> <last_name> <email> <password> <account_type?>, <is_passwordless?>, <temp_account?>')
  }
} else if(args._[0] === 'remove-account') {
  if(args['--id'] || args['--username'] || args['--email']) {

    const cb = (err, user, info) => {
      if(err || info) console.log(err, info)
      else db.deleteUser(user.id, console.log).then(db.terminate)
    }

    if(args['--id']) db.getUserFromIdIfExists(parseInt(args['--id'], 10), cb)
    if(args['--username']) db.getUserIfExists(args['--username'], cb)
    if(args['--email']) db.getUserFromEmailIfExists(args['--email'], cb)

    
  } else {
    console.log('error, no user selected\nauthcli remove-account --id <id> --username <username> --email <email>')
  }
} else if(args._[0] === 'modify-account') {
  if(args['--id'] || args['--username'] || args['--email']) {
    if(args._[1] === 'set') {
      
      const keys = args._.slice(2).filter((val, i) => i % 2 === 0)
      const values = args._.slice(2).filter((val, i) => i % 2 === 1)
      const modifications = keys.reduce((acc, curr, i) => (acc[curr] = values[i], acc), {})

      const cb = (err, user, info) => {
        if(err || info) console.log(err, info)
        else db.privilegedModifyUser(user.id, modifications, console.log).then(db.terminate)
      }

      if(args['--id']) db.getUserFromIdIfExists(parseInt(args['--id'], 10), cb)
      if(args['--username']) db.getUserIfExists(args['--username'], cb)
      if(args['--email']) db.getUserFromEmailIfExists(args['--email'], cb)
    } else {
      console.log('error, no field and key specified\nauthcli modify-account --id <id> --username <username> --email <email> set <field> <value>')
    }
  } else {
    console.log('error, no user selected\nauthcli modify-account --id <id> --username <username> --email <email> set <field> <value>')
  }
} else if(args._[0] === 'get-account') {
  if(args['--id'] || args['--username'] || args['--email']) {
    if(args['--id']) db.getUserFromIdIfExists(parseInt(args['--id'], 10), console.log).then(db.terminate)
    if(args['--username']) db.getUserIfExists(args['--username'], console.log).then(db.terminate)
    if(args['--email']) db.getUserFromEmailIfExists(args['--email'], console.log).then(db.terminate)
  } else {
    console.log('error, no user selected\nauthcli get-account --id <id> --username <username> --email <email>')
  }
} else if(args._[0] === 'list-accounts') {
  db.getUserList(console.log).then(db.terminate)
} else {
  console.log('invalid operation "' + args._[0] + '"')
}
