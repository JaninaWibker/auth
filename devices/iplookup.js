const fetch = require('node-fetch')
const db = require('../db.js')

const sendFailureNotPermitted = (res) => res.status(403).json({
  message: 'account not permitted', status: 'failure'
})
const sendError = (res, message, err) => res.status(500).json({
  message: message,
  status: 'failure',
  error: err
})
const sendSuccess = (res, message, data) => res.status(200).json({
  message: message,
  status: 'success',
  data: data
})

const request = (ip, cb) => {
  fetch(process.env.IP_LOOKUP_ENDPOINT + '/lookup/' + process.env.IP_LOOKUP_SECRET + '/' + ip)
    .then(res => res.json())
    .then(json => cb(null, json.data))
    .catch(err => cb(err, null))
}

const getFromDatabaseOrFromServiceAndThenSaveToDatabase = (ip, cb) => {
  db.Ip.get(ip, (err, data) => {
    if(err)         cb(err, null, 'failed to retrieve ip information from database')
    else if(data) {
                    cb(null, data, 'successfully retrieved ip information from database')
    } else {
      request(ip, (err, data) => {
        if(err)     cb(err, null, 'failed to retrieve ip information')
        else {

          const arr = [ data.continent, data.continent_code, data.country, data.country_code, data.region, data.region_code, data.city, data.zip, data.latitude, data.longitude, data.timezone, data.timezone_code, data.isp, data.languages, data.threat.is_mobile, data.threat.is_anonymous, data.threat.is_threat ]
          
          db.Ip.add(ip, arr, (err, idk) => {
            if(err) cb(err, null, 'failed to save newly retrieved ip information to database')
            else    cb(null, data, 'successfully retrieved ip information')
          })
        }
      })
    }
  })
}

const iplookup = (req, res) =>
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return  sendError(res, 'could not validate requesting users account type', info)
    if(user.account_type === 'admin') {

      getFromDatabaseOrFromServiceAndThenSaveToDatabase(req.body.ip, (err, data, message) => {
        if(err)     sendError(res, message, err)
        else        sendSuccess(res, message, data)
      })

    } else {
                    sendFailureNotPermitted(res)
    }
  })

module.exports = {
  getFromDatabaseOrFromServiceAndThenSaveToDatabase,
  request,
  iplookup
}