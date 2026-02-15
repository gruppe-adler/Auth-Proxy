var Cookies = require('cookies')
var request = require('request')

var config = require('./config')
var userUrl = config.userUrl || 'https://www.anrop.se/api/users/current'
var isInUserGroup = function (user, permissibleGroup) {
  // return user.groups.indexOf(permissibleGroup) !== -1 ||
  return user.groups.filter(function (group) { return group.tag === permissibleGroup }).length > 0
}

var validUsers = {}

function fetchUser (token, cb) {
  var cookie = request.cookie(config.cookie + '=' + token)
  var cookieUrl = userUrl.split('/').slice(0, 3).join('/')
  var jar = request.jar()
  jar.setCookie(cookie, cookieUrl)

  request(userUrl, {
    method: 'POST',
    jar: jar,
    json: true,
    headers: { 'Content-Type': 'application/json' },
    body: {
      query: 'mutation { authenticate { id username avatar admin groups { id tag color label hidden } } }'
    }
  }, function (err, resp, body) {
    if (err) {
      cb(err)
    } else if (body && body.errors) {
      console.error('GraphQL error:', body.errors)
      cb(new Error('GraphQL request failed'))
    } else if (body && body.data && body.data.authenticate) {
      cb(null, body.data.authenticate)
    } else {
      console.error('Authentication failed: not authenticated')
      cb(new Error('Not authenticated'))
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
