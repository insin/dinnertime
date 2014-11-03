'use strict';

/**
 * Creates an array in which the contents of the given array are interspersed
 * with... something. If that something is a function, it will be called on each
 * insertion.
 */
function intersperse(array, something) {
  if (array.length < 2) { return array }
  var result = [], i = 0, l = array.length
  if (typeof something == 'function') {
    for (; i < l; i ++) {
      if (i !== 0) { result.push(something()) }
      result.push(array[i])
    }
  }
  else {
    for (; i < l; i ++) {
      if (i !== 0) { result.push(something) }
      result.push(array[i])
    }
  }
  return result
}

module.exports = intersperse