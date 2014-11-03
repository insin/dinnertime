'use strict';

var pluralise = require('./pluralise')

function hoursMinutesSeconds(seconds) {
  var hours = Math.floor(seconds / 3600)
  var mins = Math.floor(seconds % 3600 / 60)
  var secs = seconds % 60
  var parts = []
  if (hours > 0) {
    parts.push(hours + ' hour' + pluralise(hours))
  }
  if (mins > 0) {
    parts.push(mins + ' minute' + pluralise(mins))
  }
  if (secs > 0) {
    parts.push(secs + ' second' + pluralise(secs))
  }
  return parts.join(' ')
}

module.exports = hoursMinutesSeconds