'use strict';

var React = require('react')

var DinnerTime = require('./DinnerTime')

var TEST_ITEMS = [
  {id: 'a', type: 'food', name: 'Pizza', time: 22, tend: 'Rotate'}
, {id: 'b', type: 'food', name: 'Fish Fingers', time: 15, tend: 'Flip'}
, {id: 'c', type: 'food', name: 'Potato Waffles', time: 15, tend: 'Flip'}
, {id: 'd', type: 'food', name: 'Rice', time: 12, tend: ''}
, {id: 'e', type: 'food', name: 'Beans', time: 5, tend: ''}
]

React.render(<DinnerTime items={TEST_ITEMS}/>, document.getElementById('app'))