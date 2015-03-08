'use strict';

var React = require('react')

var intersperse = require('./intersperse')

/**
 * Replaces linebreaks with <br> ReactElements.
 */
function linebreaks(text) {
  return intersperse(text.split(/\r\n|\r|\n/g), () => <br/>)
}

module.exports = linebreaks