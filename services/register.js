const format_date = (date=new Date()) => 
  date.toLocaleDateString().replace(/\//g, '-') + '@' + date.toLocaleTimeString()

module.exports = (serviceCache) => (validateService, public_key) => (req, res) => {
  console.log('[' + format_date() + '][service/register] "' + req.body.data.name + '" trying to register...')
  if(validateService(Buffer.from(req.get('Authorization').substr('Bearer '.length), 'base64'), {...req.body.data, timestamp: req.body.timestamp})) {
    if(serviceCache.keys().includes(req.body.data.name)) {
      console.log('[' + format_date() + '][service/register] "' + req.body.data.name + '" was already a known service')
      res.json({ message: 'already registered', status: 'success', public_key: public_key })
    } else {
      serviceCache.put(req.body.data.name, req.body.data)
      console.log('[' + format_date() + '][service/register] "' + req.body.data.name + '" registered successfully')
      res.json({ message: 'registration successful', status: 'success', public_key: public_key })
    }
  } else {
    console.log(
      '[' + format_date() + '][service/register] "' + req.body.data.name + '" failed to register...\nvalidation failed, investigation may be required', 
      'BODY', {...req.body.data, timestamp: req.body.timestamp, }, 
      'HEADER', req.get('Authorization')
    )
    res.json({ message: 'registration failed', status: 'failure', public_key: public_key })
  }
}