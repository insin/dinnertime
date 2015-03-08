'use strict';

function sentenceJoin(items) {
  items = items.map(item => `the ${item}`)
  return (items.length <= 2
          ? items.join(' and ')
          : items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1])
}

module.exports = sentenceJoin