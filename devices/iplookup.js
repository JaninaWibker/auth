const fetch = require('node-fetch')
const db = require('../db.js')

const IP_LOOKUP_DISABLED = process.env.IP_LOOKUP_ENDPOINT === undefined || process.env.IP_LOOKUP_ENDPOINT === ''

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
  if(IP_LOOKUP_DISABLED) return cb(null, {
    ip: ip, 
    status: 'successful', 
    continent: 'None', continent_code: null, country: null, country_code: null, region: null, region_code: null, city: null, zip: null, latitude: 0, longitude: 0, timezone: null, timezone_code: null, isp: null, thread: { is_mobile: false, is_anonymous: false, is_threat: false },
    is_internal: true,
    is_disabled: true
  })

  fetch(process.env.IP_LOOKUP_ENDPOINT + '/lookup/' + process.env.IP_LOOKUP_SECRET + '/' + ip)
    .then(res => res.json())
    .then(json => cb(null, json))
    .catch(err => cb(err, null))
}

const getFromDatabaseOrFromServiceAndThenSaveToDatabase = (ip, cb) => {

  db.Ip.get(ip, (err, data) => {
    if(err)           cb(err, null, 'failed to retrieve ip information from database')
    else if(data) {
                      cb(null, data, 'successfully retrieved ip information from database')
    } else {
      request(ip, (err, json) => {
        if(err)       cb(err, null, 'failed to retrieve ip information')
        else {
          const data = json.data
          const arr = [data.continent, data.continent_code, data.country, data.country_code, data.region, data.region_code, data.city, data.zip, data.latitude, data.longitude, data.timezone, data.timezone_code, data.isp, data.languages, data.threat.is_mobile, data.threat.is_anonymous, data.threat.is_threat]
          
          if(data.is_internal) {
            db.Ip.addInternal(ip, (err, _rtn) => {
              if(err) cb(err, null, 'failed to save newly retrieved internal ip information to database')
              else    cb(null, data, 'successfully retrieved internal ip information')
            })
          } else {
            db.Ip.add(ip, arr, (err, _rtn) => {
              if(err) cb(err, null, 'failed to save newly retrieved ip information to database')
              else    cb(null, data, 'successfully retrieved ip information')
            })
          }

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