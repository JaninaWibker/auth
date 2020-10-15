const userAgent = require('./user-agent.js')

const parse_ua = (ua) => {
  const res = userAgent().parse(ua)
  let parsed = {
    platform: '',
    browser: '',
    formfactor: ''
  }

  if(res.isBot) {
    parsed.platform = res.platform
    parsed.browser = res.os
    parsed.formfactor = 'Bot'
  } else if(res.isDesktop) {
    parsed.platform = res.os
    parsed.formfactor = 'Desktop'
    if(res.browser === 'Safari') {
      parsed.browser = res.browser + ' ' + res.version // Safari versions aren't that long compared to Chrome or Firefox so no shortening is required.
    } else {
      parsed.browser = res.browser + (res.version ? res.version.split('.')[0] ? (' ' + res.version.split('.')[0]) : '' : '')
    }
  } else if(res.isMobile) {
    parsed.formfactor = 'Mobile'
    if(res.isiPad || res.isiPhone || res.isiPod) {
      const iosVersion = (ua.match(/OS ((\d+_?){2,3})/)[1] || '').replace(/_/g, '.')
      parsed.platform = 'iOS ' + iosVersion + ' (' + res.platform + ')'
      if(res.browser === 'Apple WebKit') {
        parsed.browser = 'Webkit ' + res.version + ' based browser'
      } else {
        parsed.browser = res.browser + ' ' + res.version
      }
    } else if(res.isAndroid) {
      parsed.platform = 'Android ' + (ua.match(/Android ((\d+\.?){1,3});/)[1] || '') // extract Android version if possible
      if(res.browser === 'Safari') {
        parsed.browser = 'Browser' // is misidentified as Safari
      } else {
        parsed.browser = res.browser + (res.version ? res.version.split('.')[0] ? (' ' + res.version.split('.')[0]) : '' : '')
      }
    }
  } else {
    parsed.platform = res.os + ' (' + res.platform + ')'
    parsed.browser = res.browser
    parsed.formfactor = 'Other'
  }

  parsed.str = `${res.browser} on ${parsed.platform}`

  return parsed
}

module.exports = parse_ua