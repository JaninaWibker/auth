const url = require('url')

// Note: express http converts all headers to lower case.
const AUTH_HEADER = "authorization"
const BEARER_AUTH_SCHEME = 'bearer'

const header_scheme_value_re = /(\S+)\s+(\S+)/

const parse_auth_header = header_value => {
  if (typeof header_value !== 'string') return null

  const matches = header_value.match(header_scheme_value_re)
  return matches && { scheme: matches[1], value: matches[2] }
}

const extractors = {
  fromHeader: header_name => req => req.headers[header_name] ? req.headers[header_name] : null,

  fromBodyField: field_name => req =>
    req.body && Object.prototype.hasOwnProperty.call(req.body, field_name)
      ? req.body[field_name]
      : null,

  fromUrlQueryParameter: param_name => req => {
    let token = null
    const parsed_url = url.parse(req.url, true)
    if(parsed_url.query && Object.prototype.hasOwnProperty.call(parsed_url.query, param_name)) {
      token = parsed_url.query[param_name]
    }
    return token
  },

  fromAuthHeaderWithScheme: auth_scheme => req => {
    let token = null
    if(request.headers[AUTH_HEADER]) {
      const auth_params = parse_auth_header(req.headers[AUTH_HEADER])
      if(auth_params && auth_scheme.toLowerCase() === auth_params.scheme.toLowerCase()) {
        token = auth_params.value
      }
    }
    return token
  },

  fromAuthHeaderAsBearerToken: () => extractors.fromAuthHeaderWithScheme(BEARER_AUTH_SCHEME),
}

/**
 * Export the Jwt extraction functions
 */
module.exports = extractors