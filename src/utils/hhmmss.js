'use strict';

function hhmmss(seconds) {
  var hours = Math.floor(seconds / 3600)
  var mins = Math.floor(seconds % 3600 / 60)
  var secs = seconds % 60
  var parts = []
  if (hours > 0) {
    parts.push(hours)
  }
  parts.push(hours === 0 ? mins : (mins < 10 ? '0' + mins : mins))
  parts.push(secs < 10 ? '0' + secs : secs)
  return parts.join(':')
}

module.exports = hhmmss