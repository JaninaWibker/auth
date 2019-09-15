function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function getServiceInfo(id, cb) {
  window.fetch('/service/by-id/' + id)
    .then(function(res) { return res.json() })
    .then(cb)
}

function login(username, passwordOrRefreshToken, isRefreshToken=false, getRefreshToken=false, alternativeOrigin="") {
  return window.fetch(alternativeOrigin + '/login', {
    method: 'POST',
    body: JSON.stringify({
      username: username,
      password: passwordOrRefreshToken,
      isRefreshToken: isRefreshToken,
      getRefreshToken: getRefreshToken
    }),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Device-Id': getStorage('device_id') || ''
    }
  })
  .then(function(res) { return res.status === 401 ? Promise.reject({ status: res.status, message: res.json() }) : res.json() })
  .then(function(json) {
    console.log(json)
    if(json.device_id) {
      setStorage('device_id', json.device_id)
    }
    return json
  })
}

function testIfJwtWorks(token, cb, alternativeOrigin='') {
  window.fetch(alternativeOrigin + '/users/test', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  })
    .then(function(res) { return res.json() })
    .then(function(json) {
      if(json.status === 'success') {
        setStorage('user', JSON.stringify(json.user))
        return cb(null, true)
      } else {
        return cb(null, false)
      }
      
    })
    .catch(function catchTestIfJwtWorks(err) { return cb(err, false)})
}

function testIfRefreshTokenWorks(token, cb, alternativeOrigin="") {
  login(storageObject.username, token, true, false, alternativeOrigin)
    // .then(function(res) { return res.json() })
    .then(function(json) {
      if(json.status === 'failure') {
        return cb(null, false)
      } else {
        setStorage('jwt', json.token)
        return cb(null, true)
      }
    })
    .catch(function catchTestIfRefreshTokenWorks(err) { return cb(err, false) })
}

function updateSavedUserData(token, cb) {
  // testIfRefreshTokenWorks tries to log-in with the refresh-token, this is exactly what
  // is needed here. The verb 'test' may be somewhat wrong but it is the wanted behaviour.
  // It also updates the stored jwt
  testIfRefreshTokenWorks(token, function(err, bool) {
    if(bool) {
      // testIfJwtWorks updates the saved user data. This is again exactly what is wanted,
      // but also again somewhat misleading name-whise. The result of the test is unimportant
      // since it must true since the jwt has just been generated.
      testIfJwtWorks(getStorage('jwt'), function(err, bool) {
        if(bool) cb(null, JSON.parse(getStorage('user')))
        else cb({ message: 'invalid JWT', status: 'failure', error: err }, null)
      })
    } else {
      cb({ message: 'invalid RefreshToken', status: 'failure', error: err }, null)
    }
  })
}

function updateSavedUserDataIfNeeded(token, cb) {
  const storageObject = getStorageObject()
  if(storageObject.user || storageObject.refreshToken) {
    let user
    try {
      user = JSON.parse(storageObject.user)
      updateSavedUserData(storageObject.refreshToken, function cbUpdateSavedUserData(err, user) {
        if(err)  {
          setStorageObject({
            theme: getStorage('theme'),
            jwt: null,
            refreshToken: null,
            remember_me: false,
            user: null,
            username: null,
            fullname: null,
          })
          cb({ message: 'could not retrieve updated user object, invalid RefreshToken, resetting storage', status: 'failure', error: err }, null)
        } else {
          cb(null, user)
        }
      })
    } catch (err) {
      cb({ message: 'could not deserialize storageObject.user, this means the data is corrupted', status: 'failure', error: err }, null)
    }
  } else {
    cb({ message: 'no saved user found', status: 'failure', error: null }, null)
  }
}

function createElement(type, attributes) {
  const el = document.createElement(type)

  for(const key in attributes) {
    el.setAttribute(key, attributes[key])
  }

  return el
}

function getStorage(key) {
  var st = window.localStorage.getItem(window.location.hostname + '.storage')
  if(st) {
    st = JSON.parse(st)
  } else {
    st = {}
    window.localStorage.setItem(window.location.hostname + '.storage', '{}')
  }

  return st[key]
}

function getStorageObject() {
  var st = window.localStorage.getItem(window.location.hostname + '.storage')
  if(st) {
    return JSON.parse(st)
  } else {
    window.localStorage.setItem(window.location.hostname + '.storage', '{}')
    return {}
  }
}

function setStorage(key, value) {
  var st = window.localStorage.getItem(window.location.hostname + '.storage')

  if(st) st = JSON.parse(st)
  else st = {}
  
  st[key] = value
  window.localStorage.setItem(window.location.hostname + '.storage', JSON.stringify(st))
  return value
}

function setStorageObject(obj) {
  var st = window.localStorage.getItem(window.location.hostname + '.storage')

  if(st) st = JSON.parse(st)
  else st = {}

  var keys = Object.keys(obj)
  for(var i = 0; i < keys.length; i++) {
    st[keys[i]] = obj[keys[i]]
  }

  window.localStorage.setItem(window.location.hostname + '.storage', JSON.stringify(st))
  return obj
}

function removeStorage(key) {
  return setStorage(key, undefined)
}

function resetStorage() {
  window.localStorage.setItem(window.location.hostname + '.storage', '{}')
}

function $toggleTheme(theme, doSetStorage=true) {
  if(theme) {
    document.body.className = 'theme-' + theme
    if(doSetStorage) setStorage('theme', theme)
  } else {
    if(document.body.className === 'theme-dark') {
    document.body.className = 'theme-light'
    if(doSetStorage) setStorage('theme', 'light')
    } else {
      document.body.className = 'theme-dark'
      if(doSetStorage) setStorage('theme', 'dark')
    }
  }
}