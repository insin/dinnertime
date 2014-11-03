'use strict';

var React = require('react')

var speech = require('./utils/speech')

var Finished = React.createClass({
  componentWillMount: function() {
      speech.speak("It's Dinner Time!")
  },

  render: function() {
    return <div className="Wrapper">
      <div className="Main"><div className="Content">
        <div className="Finished">It's Dinner Time!</div>
      </div></div>
    </div>
  }
})

module.exports = Finished