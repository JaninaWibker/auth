const db = require('../db.js')

const sendFailureNotPermitted = (res) => res.status(403).json({
  message: 'account not permitted', status: 'failure'
})

const sendError = (res, message, err) => res.status(500).json({
  message: message,
  status: 'failure',
  error: err
})

const sendFailure = (res, message) => res.status(500).json({
  message: message,
  status: 'failure'
})

const sendSuccess = (res, message, devices) => res.status(200).json({
  message: message,
  devices: devices,
  count: devices.length,
  status: 'success'
})

/*
  {
    user_id -- usable by admins, defaults to req.user.id
  }
*/

const mapDevice = (device) => ({
  device_id: device.device_id,
  user_agent: device.user_agent,
  device_creation_date: device.device_creation_date,
  creation_date: device.creation_date,
  is_revoked: device.is_revoked,
  last_used: new Date(),
  ip: device.ip,
  ip_information: {
    continent: device.continent,
    continent_code: device.continent_code,
    country: device.country,
    country_code: device.country_code,
    region: device.region,
    region_code: device.region_code,
    city: device.city,
    zip: device.zip,
    latitude: device.latitude,
    longitude: device.longitude,
    timezone: device.timezone,
    timezone_code: device.timezone_code,
    isp: device.isp,
    language: device.language,
    is_mobile: device.is_mobile,
    is_anonymous: device.is_anonymous, 
    is_threat: device.is_threat,
    is_internal: device.is_internal,
  }
})

const listDevices = (req, res) =>
  db.getUserFromIdIfExists(req.user.id, (err, user, info) => {
    if(err) return sendError(res, 'could not validate requesting users account type', info)
    if(req.params.user_id && req.params.user_id !== user.id && user.account_type === 'admin') {
      db.Device.list(parseInt(req.params.user_id, 10), (err, devices, info) => {
        if(err || info) sendFailure(res, info ? info.message : err)
        else            sendSuccess(res, 'sucecssfully retrieved list of devices for user ' + req.params.user_id, devices.map(mapDevice))
      })
    } else if(req.params.user_id && req.params.user_id !== user.id && user.account_type !== 'admin') {
                        sendFailureNotPermitted(res)
    } else {
      db.Device.list(req.user.id, (err, devices, info) => {
        if(err || info) sendFailure(res, info ? info.message : err)
        else            sendSuccess(res, 'sucecssfully retrieved list of devices for user ' + req.user.id, devices.map(mapDevice))
      })
    }
  })

module.exports = listDevices