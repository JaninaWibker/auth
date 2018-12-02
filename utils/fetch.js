const _fetch = require('node-fetch')

const fetchTimeout = (url, method, body, headers, timeout=50) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Request timed out')), timeout)
  return fetch(url, method, body, headers)
    .then(resolve)
    .catch(reject)
    .finally((x) => (console.log(x), clearTimeout(timer), x))
})

const fetch = (url, method='POST', body, headers) => _fetch(url, {
  body: method === 'POST' ? JSON.stringify(body) : null,
  method: method,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...headers
  }
})

module.exports = {
  fetchTimeout,
  fetch
}