'use strict';

var React = require('react/addons')

var AppStates = require('./AppStates')
var calculateSteps = require('./calculateSteps')
var CookingTimer = require('./CookingTimer')
var Finished = require('./Finished')
var Planner = require('./Planner')

var DinnerTime = React.createClass({
  getInitialState: function() {
    return {
      appState: AppStates.INPUT
    , items: null
    , steps: null
    , sayInstructions: null
    , playStepSound: null
    }
  },

  handleStartCooking: function(options) {
    this.setState({
      appState: AppStates.COOKING
    , items: options.items
    , steps: calculateSteps(options.items)
    , sayInstructions: options.sayInstructions
    , playStepSound: options.playStepSound
    })
  },

  handleFinishedCooking: function() {
    this.setState({
      appState: AppStates.FINISHED
    })
  },

  render: function() {
    return <div className={'DinnerTime DinnerTime--' + this.state.appState}>
      {this.renderContent()}
    </div>
  },

  renderContent: function() {
    if (this.state.appState == AppStates.INPUT) {
      return <Planner onStartCooking={this.handleStartCooking}/>
    }
    else if (this.state.appState == AppStates.COOKING) {
      return <CookingTimer
        steps={this.state.steps}
        onFinishedCooking={this.handleFinishedCooking}
        playStepSound={this.state.playStepSound}
        sayInstructions={this.state.sayInstructions}
      />
    }
    else if (this.state.appState == AppStates.FINISHED) {
      return <Finished/>
    }
  }
})

module.exports = DinnerTime