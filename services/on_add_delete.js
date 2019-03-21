const jwt = require('jsonwebtoken')
const { event } = require('../analytics.js')
const isProduction = require('dotenv').config().parsed['ENVIRONMENT'] === 'PROD'

const { fetchTimeout } = require('../utils/fetch.js')

const LOGGING = true

const account_types = ['default', 'privileged', 'admin']

const format_date = (date=new Date()) =>
  date.toLocaleDateString().replace(/\//g, '-') + '@' + date.toLocaleTimeString()

const mapService = (logStr, payload, service) => {
  if(isProduction) event({
    category: 'SERVICE_ADD',
    title: `${service.name} has been added to the list of services`,
    data: service
  })
  if(LOGGING) console.log(
    '[' + format_date() + '][' + logStr + ']',
    {name: service.name, account_type: service.account_type},
    {id: payload.id, account_type: payload.account_type}
  )

  return service
}

const shouldNotifyService = (logStr, payload, service) => {

  if(service.id === 'auth') return false

  const shouldNotifyServiceBool = payload && service.account_type
        ? account_types.indexOf(payload.account_type) >= account_types.indexOf(service.account_type) 
        : true

  if(LOGGING && shouldNotifyServiceBool) console.log(
    '[' + format_date() + '][' + logStr + ']',
    {name: service.name, account_type: service.account_type},
    {id: payload.id, account_type: payload.account_type},
    account_types.indexOf(payload.account_type), account_types.indexOf(service.account_type)
  )

  return shouldNotifyServiceBool
}

const signServiceJwt = (private_key, id) =>
  jwt.sign({ id: id, isAuthProvider: true }, private_key, { algorithm: 'RS256' })

module.exports = (serviceCache) => ({
  onAdd: (private_key) => (id, token, payload) =>
    Promise.all(serviceCache.keys()
      .map(key => mapService('onAdd', payload, serviceCache.get(key)))
      .filter(service => shouldNotifyService('onAdd', payload, service))
      .map(service => fetchTimeout(service.url + '/login', 'POST', { id, token }, { Authorization: 'Bearer ' + signServiceJwt(private_key, id) } )
        .then(res => res.status === 401 ? res.text() : res.json())
        .catch(err => (console.log('[' + format_date() + '][onAdd] server not responding (' + service.name + ')'), err))
        .then(text_or_json => console.log('[' + format_date() + '][fetch]', text_or_json))
      )
    ),
  onDelete: (private_key) => (id, token, payload) =>
    Promise.all(serviceCache.keys()
      .map(key => mapService('onDelete', payload, serviceCache.get(key)))
      .filter(service => shouldNotifyService('onDelete', payload, service))
      .map(service => fetchTimeout(service.url + '/logout', 'POST', { id, token }, { Authorization: 'Bearer ' + signServiceJwt(private_key, id) })
        .then(res => res.status === 401 ? res.text() : res.json())
        .catch(err => (console.log('[' + format_date() + '][onDelete] server not responding (' + service.name + ')'), err))
        .then(text_or_json => console.log('[' + format_date() + '][fetch]', text_or_json))
      )
    )
})