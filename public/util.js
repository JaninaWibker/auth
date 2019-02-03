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

function login(username, passwordOrRefreshToken, isRefreshToken=false, getRefreshToken=false) {
  return window.fetch('/login', {
    method: 'POST',
    body: JSON.stringify({
      username: username,
      password: passwordOrRefreshToken,
      isRefreshToken: isRefreshToken,
      getRefreshToken: getRefreshToken
    }),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
}

function getStorage(key) {
  var st = window.localStorage.getItem('accounts.jannik.ml.storage')
  if(st) {
    st = JSON.parse(st)
  } else {
    st = {}
    window.localStorage.setItem('accounts.jannik.ml.storage', '{}')
  }

  return st[key]
}

function getStorageObject() {
  var st = window.localStorage.getItem('accounts.jannik.ml.storage')
  if(st) {
    return JSON.parse(st)
  } else {
    window.localStorage.setItem('accounts.jannik.ml.storage', '{}')
    return {}
  }
}

function setStorage(key, value) {
  var st = window.localStorage.getItem('accounts.jannik.ml.storage')

  if(st) st = JSON.parse(st)
  else st = {}
  
  st[key] = value
  window.localStorage.setItem('accounts.jannik.ml.storage', JSON.stringify(st))
  return value
}

function setStorageObject(obj) {
  var st = window.localStorage.getItem('accounts.jannik.ml.storage')

  if(st) st = JSON.parse(st)
  else st = {}

  var keys = Object.keys(obj)
  for(var i = 0; i < keys.length; i++) {
    st[keys[i]] = obj[keys[i]]
  }

  window.localStorage.setItem('accounts.jannik.ml.storage', JSON.stringify(st))
  return obj
}

function removeStorage(key) {
  return setStorage(key, undefined)
}

function resetStorage() {
  window.localStorage.setItem('accounts.jannik.ml.storage', '{}')
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