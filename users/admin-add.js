const db = require('../db.js')

module.exports = (req, res) => {
  if(req.user.account_type === 'admin') {
    const data = req.body
  
    if(data.username  && data.first_name && data.last_name && data.email) {
      const account_type = data.account_type || 'default'
      const metadata = data.metadata || '{}'
      const is_passwordless = data.is_passwordless || false
      const temp_account = data.temp_account || 0

      const password = is_passwordless ? '' : data.password

      db.addUser(data.username, password, data.first_name, data.last_name, data.email, account_type, metadata, is_passwordless, temp_account, (err, row) => {
        if(err) {
          console.log(err, row)
          res.json({ message: err, status: 'failure' })
        } else {
          console.log('[' + format_date() + '][user/add] "' + row.lastID, row)
          res.json({
            message: 'account creation successful',
            status: 'success',
            data: {
              username: data.username,
              first_name: data.first_name,
              last_name: data.last_name,
              email: data.email,
              account_type: account_type,
              metadata: metadata
            }
          })
        }
      })
    } else {
      res.json({
        message: '',
        status: 'failure'
      })
    }
  } else {
    res.status(403).json({
      message: 'account not privileged', status: 'failure'
    })
  }

}