var Cookies = require('cookies')
var request = require('request')

var config = require('./config')
var isInUserGroup = function (user, permissibleGroup) {
  // return user.groups.indexOf(permissibleGroup) !== -1 ||
  return user.groups.filter(function (group) { return group.name === permissibleGroup }).length > 0
}

var validUsers = {}

function fetchUser (token, cb) {
  var cookie = request.cookie(config.cookie + '=' + token)
  var cookieUrl = config.apiUrl.split('/').slice(0, 3).join('/')
  var jar = request.jar()
  jar.setCookie(cookie, cookieUrl)

  request(config.apiUrl + config.userUri, {jar: jar, json: true}, function (err, resp, targetUserUri) {
    if (err) {
      cb(err)
    } else {
      request(config.apiUrl + targetUserUri, {jar: jar, json: true}, function (err, resp, userBody) {
        if (err) {
          cb(err)
        } else {
          cb(null, userBody)
        }
      })
    }
  })
}

function validateUser (userId, cb) {
  fetchUser(userId, function (err, user) {
    if (err) {
      console.error(err)
      cb(err)
    } else {
      if (user.groups && isInUserGroup(user, config.group)) {
        validUsers[userId] = user
        console.log('User is allowed access')
        cb(null, user)
      } else {
        console.log('User did not have correct group')
        cb(new Error('Unauthorized'))
      }
    }
  })
}

module.exports = function (req, cb) {
  var cookies = new Cookies(req)
  var token = cookies.get(config.cookie)

  if (token) {
    if (validUsers[token]) {
      cb(null, validUsers[token])
    } else {
      validateUser(token, cb)
    }
  } else {
    console.log('No cookie found in request')
    cb(new Error('Unauthorized'))
  }
}
