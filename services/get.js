module.exports = (serviceCache) => (method) => (req, res) => {

  if(!req.params.id) res.json({ message: 'supply id/name/app/cb (/service/:method/:id)', status: 'failure' })

  const scKeys = serviceCache.keys()

  const filter_find_match = (field) => scKeys
    .map(key => serviceCache.get(key))
    .filter(service => service[field] === req.params.id)
    
  const find_match = (field) => {
    const rtn = filter_find_match(field)[0]
    if(rtn) {
      return { ...rtn, status: 'success' }
    } else {
      return ({ message: 'service not found', status: 'failure' })
    }
  }

  switch(method) {
    case 'by-id':   return res.json(find_match('id'))
    case 'by-name': return res.json(find_match('name'))
    case 'by-app':  return res.json(find_match('app'))
    case 'by-cb':   return res.json(find_match('url'))
    default:        return res.json({ message: 'supply method and id/name/app/cb', status: 'failure' })
  }
}