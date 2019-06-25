const URL = require('url')

const cors = (req, res, next) => {

  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Device-Id')

  const url = URL.parse(req.protocol + '://' + req.get('origin'))
  const url_reversed_arr = url.hostname.split('.').reverse()

  if((url_reversed_arr[0] === 'ml' && url_reversed_arr[1] === 'jannik') 
  || (url_reversed_arr[0] === 'net' && url_reversed_arr[1] === 'ddns' && url_reversed_arr[2] === 'jannik')
  || (url_reversed_arr[3] === '192' && url_reversed_arr[2] === '168' && url_reversed_arr[1] === '178')
  || (url_reversed_arr[0] === 'jannik-rpi3')
  || (url_reversed_arr[0] === 'jannik-mbp-2017')
  || (url_reversed_arr[0] === 'samba-server')
  || (url_reversed_arr[0] === 'localhost')) {
    res.header('Access-Control-Allow-Origin', req.get('origin'))
  } else {
    console.log('[CORS] Unauthorized Access from ' + req.get('origin'))
    res.header('Access-Control-Allow-Origin', '')
  }

  next()
}

module.exports = cors