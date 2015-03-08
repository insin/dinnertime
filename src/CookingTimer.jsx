'use strict';

var React = require('react')

var hhmmss = require('./utils/hhmmss')
var linebreaks = require('./utils/linebreaks')
var speech = require('./utils/speech')

var CookingTimer = React.createClass({
  propTypes: {
    onFinishedCooking: React.PropTypes.func.isRequired
  , playStepSound: React.PropTypes.bool
  , sayInstructions: React.PropTypes.bool
  , steps: React.PropTypes.array.isRequired
  },

  getInitialState() {
    return {
      timeElapsed: 0
    , timeRemaining: this.props.steps[0].time
    , timeToNextStep: this.props.steps[0].time - this.props.steps[1].time
    , stepIndex: 0
    }
  },

  componentWillMount() {
    this.announceStep(this.props.steps[0])
    this.timer = setInterval(this.tick, 1000)
  },

  componentWillUnmount() {
    clearInterval(this.timer)
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.state.stepIndex != prevState.stepIndex) {
      this.announceStep(this.props.steps[this.state.stepIndex])
    }
    if (this.state.timeToNextStep == 5 && this.props.playStepSound) {
      this.refs.pips.getDOMNode().currentTime = 0
      this.refs.pips.getDOMNode().play()
    }
  },

  announceStep(step) {
    if (this.props.sayInstructions) {
      speech.speak(step.instructions.split('\n').join('. '))
    }
  },

  tick() {
    var timeElapsed = this.state.timeElapsed + 1
    var timeRemaining = this.state.timeRemaining - 1
    var timeToNextStep = this.state.timeToNextStep - 1

    // We finished cooking - go eat!
    if (timeRemaining === 0) {
      return this.props.onFinishedCooking()
    }

    // We've reached the next step, bump the step index
    if (timeToNextStep === 0) {
      this.setState({
        timeElapsed: timeElapsed
      , timeRemaining: timeRemaining
      , timeToNextStep: timeToNextStep
      , stepIndex: this.state.stepIndex + 1
      })
    }
    // First tick after moving to the next step - recalculate timeToNextStep now
    // that a tick has passed.
    else if (timeToNextStep == -1) {
      this.setState({
        timeElapsed: timeElapsed
      , timeRemaining: timeRemaining
      , timeToNextStep: timeRemaining - this.props.steps[this.state.stepIndex + 1].time
      })
    }
    // Nothing but cooking happened
    else {
      this.setState({
        timeElapsed: timeElapsed
      , timeRemaining: timeRemaining
      , timeToNextStep: timeToNextStep
      })
    }
  },

  fastForward(timeToNextStep) {
    this.setState({
      timeElapsed: this.state.timeElapsed + timeToNextStep - 6
    , timeRemaining: this.state.timeRemaining - timeToNextStep + 6
    , timeToNextStep: 6
    })
  },

  complete() {
    this.setState({
      timeRemaining: 1
    })
  },

  render() {
    var debugControls
    if ('development' === process.env.NODE_ENV) {
      debugControls = <div>
        <button type="button" onClick={this.fastForward.bind(this, this.state.timeToNextStep)}>Fast-Forward</button>{' '}
        <button type="button" onClick={this.complete}>Complete</button>
      </div>
    }
    var step = this.props.steps[this.state.stepIndex]
    var nextStep = this.props.steps[this.state.stepIndex + 1]
    return <div className="Wrapper">
      <div className="Header">
        <div className="CookingTimer__header">
          <div className="CookingTimer__title">Dinner Time!</div>
          <div className="CookingTimer__remaining">Time Left: {hhmmss(this.state.timeRemaining)}</div>
        </div>
      </div>
      <div className="Main"><div className="Content">
        <div className="CookingTimer">
          <div className="CookingTimer__currentstep">
            [DT-{hhmmss(step.time)}] {linebreaks(step.instructions)}
          </div>
        </div>
      </div></div>
      <div className="Footer">
        <div className="CookingTimer__nextstep">
          Next step in {hhmmss(this.state.timeToNextStep)}:
          <div className="CookingTimer__nextinstructions">
            {linebreaks(nextStep.instructions)}
          </div>
        </div>
        {debugControls}
      </div>
      {this.props.playStepSound && <audio ref="pips">
        <source src="pips.ogg" type="audio/ogg"/>
      </audio>}
    </div>
  }
})

module.exports = CookingTimer