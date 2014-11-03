'use strict';

var HAS_SPEECH = ('speechSynthesis' in window)

var AppStates = {
  INPUT: 'input'
, COOKING: 'cooking'
, FINISHED: 'finished'
}

var idSeed = 1

function calculateSteps(items) {
  // Add "tend" items for half the cooking time of items which need to be
  // tended to.
  items.forEach(function(item) {
    if (item.tend) {
      items.push({type: 'tend', name: item.name, time: item.time / 2, tendType: item.tend})
    }
  })

  // Sort items by time, descending, to get the order things need to happen in
  items.sort(function(a, b) {
    return b.time - a.time
  })

  var steps = []

  // Walk items, generating steps with tasks and time from the end of cooking
  // they need to happen at.
  var step = null
  items.forEach(function(item) {
    if (step == null) {
      step = {start: [item.name], flip: [], rotate: [], time: item.time, instructions: null, duration: null}
      steps.push(step)
      return
    }
    // If this item doesn't happen at the same time as the previous step,
    // create a new step.
    if (item.time != step.time) {
      step = {start: [], flip: [], rotate: [], time: item.time, instructions: null, duration: null}
      steps.push(step)
    }
    if (item.type == 'food') {
      step.start.push(item.name)
    }
    else if (item.type == 'tend') {
      if (item.tendType == 'Flip') {
        step.flip.push(item.name)
      }
      else if (item.tendType == 'Rotate') {
        step.rotate.push(item.name)
      }
    }
  })

  // Prepare step for use, converting time to seconds and calculating instructions
  // and durations now the different tasks which need to happen at the same time
  // have been grouped together.
  var prevStep = null
  steps.forEach(function(step) {
    var instructions = ''
    if (step.start.length) {
      instructions += 'Start cooking ' + sentenceJoin(step.start) + '.'
    }
    if (instructions && step.flip.length) {
      instructions += '\n'
    }
    if (step.flip.length) {
      instructions += 'Flip ' + sentenceJoin(step.flip) + '.'
    }
    if (instructions && step.rotate.length) {
      instructions += '\n'
    }
    if (step.rotate.length) {
      instructions += 'Rotate ' + sentenceJoin(step.rotate) + '.'
    }
    step.instructions = instructions

    // Convert time from minutes to seconds
    step.time = Math.floor(step.time * 60)

    // Calculate the duration of the previous step in seconds, based on the time
    // difference with the current step.
    if (prevStep != null) {
      prevStep.duration = prevStep.time - step.time
    }
    prevStep = step
  })

  steps.push({type: 'finish', time: 0, instructions: 'Eat!'})

  return steps
}

function prefixEach(items, prefix) {
  return items.map(function(item) {
    return prefix + item
  })
}

function sentenceJoin(items) {
  items = items.map(function(item) {
    return 'the ' + item
  })
  return (items.length <= 2
          ? items.join(' and ')
          : items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1])
}

function pluralise(howMany, suffixes) {
  return (suffixes || ',s').split(',')[(howMany == 1 ? 0 : 1)]
}

function announce(text) {
  if (HAS_SPEECH) {
    speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  }
}

function hhmmss(seconds) {
  var hours = Math.floor(seconds / 3600)
  var mins = Math.floor(seconds / 60)
  var secs = seconds % 60
  var parts = []
  if (hours > 0) {
    parts.push(hours)
  }
  parts.push(mins)
  parts.push(secs < 10 ? '0' + secs : secs)
  return parts.join(':')
}

function hoursMinutesSeconds(seconds) {
  var hours = Math.floor(seconds / 3600)
  var mins = Math.floor(seconds / 60)
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

function makeObj(prop, value) {
  var obj = {}
  obj[prop] = value
  return obj
}

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

/**
 * Replaces linebreaks with <br> ReactElements.
 */
function linebreaks(text) {
  return intersperse(text.split(/\r\n|\r|\n/g), function() { return <br/> })
}

var CookingTimer = React.createClass({
  propTypes: {
    onFinishedCooking: React.PropTypes.func.isRequired
  , playStepSound: React.PropTypes.bool
  , sayInstructions: React.PropTypes.bool
  , steps: React.PropTypes.array.isRequired
  },

  getInitialState: function() {
    return {
      timeElapsed: 0
    , timeRemaining: this.props.steps[0].time
    , timeToNextStep: this.props.steps[0].time - this.props.steps[1].time
    , stepIndex: 0
    }
  },

  componentWillMount: function() {
    this.announceStep(this.props.steps[0])
    this.timer = setInterval(this.tick, 1000)
  },

  componentWillUnmount: function() {
    clearInterval(this.timer)
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (this.state.stepIndex != prevState.stepIndex) {
      this.announceStep(this.props.steps[this.state.stepIndex])
    }
    if (this.state.timeToNextStep == 5 && this.props.playStepSound) {
      this.refs.pips.getDOMNode().currentTime = 0
      this.refs.pips.getDOMNode().play()
    }
  },

  announceStep: function(step) {
    if (this.props.sayInstructions) {
      announce(step.instructions.split('\n').join('. '))
    }
  },

  tick: function() {
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

  fastForward: function(timeToNextStep) {
    this.setState({
      timeElapsed: this.state.timeElapsed + timeToNextStep - 6
    , timeRemaining: this.state.timeRemaining - timeToNextStep + 6
    , timeToNextStep: 6
    })
  },

  complete: function() {
    this.setState({
      timeRemaining: 1
    })
  },

  render: function() {
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
        <button type="button" onClick={this.fastForward.bind(this, this.state.timeToNextStep)}>Fast-Forward</button>{' '}
        <button type="button" onClick={this.complete}>Complete</button>
      </div>
      {this.props.playStepSound && <audio ref="pips">
        <source src="pips.ogg" type="audio/ogg"/>
      </audio>}
    </div>
  }
})

var TEST_ITEMS = [
  {id: 'a', type: 'food', name: 'Pizza', time: 22, tend: 'Rotate'}
, {id: 'b', type: 'food', name: 'Fish Fingers', time: 15, tend: 'Flip'}
, {id: 'c', type: 'food', name: 'Potato Waffles', time: 15, tend: 'Flip'}
, {id: 'd', type: 'food', name: 'Rice', time: 12, tend: ''}
, {id: 'e', type: 'food', name: 'Beans', time: 5, tend: ''}
]

var DinnerTime = React.createClass({
  getInitialState: function() {
    return {
      appState: AppStates.INPUT
    , items: [{id: idSeed++, type: 'food', name: '', time: '', tend: ''}]
    , schedule: null
    , sayInstructions: HAS_SPEECH
    , playStepSound: true
    }
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (prevState.appState != AppStates.FINISHED && this.state.appState == AppStates.FINISHED) {
      announce("It's Dinner Time!")
    }
  },

  onChangeItem: function(index, e) {
    var el = e.target
    var name = el.name
    var type = el.type
    var stateChange = {}

    if (type == 'checkbox') {
      stateChange[name] = {$set: el.checked}
    }
    else if (type == 'number') {
      stateChange[name] = {$set: Number(el.value)}
    }
    else {
      stateChange[name] = {$set: el.value}
    }

    this.setState({
      items: React.addons.update(this.state.items, makeObj(index, stateChange))
    })
  },

  onChangeOption: function(e) {
    this.setState(makeObj(e.target.name, e.target.checked))
  },

  addItem: function() {
    this.setState({
      items: React.addons.update(this.state.items, {
        $push: [{id: idSeed++, type: 'food', name: '', time: '', tend: ''}]
      })
    })
  },

  deleteItem: function(index) {
    this.setState({
      items: React.addons.update(this.state.items, {$splice: [[index, 1]]})
    })
  },

  startCooking: function() {
    // TODO Validate items
    this.setState({
      appState: AppStates.COOKING
    , steps: calculateSteps(this.state.items)
    })
  },

  handleFinishedCooking: function() {
    this.setState({appState: AppStates.FINISHED})
  },

  render: function() {
    return <div className={'DinnerTime DinnerTime--' + this.state.appState}>
      {this.renderContent()}
    </div>
  },

  renderContent: function() {
    if (this.state.appState == AppStates.INPUT) {
      return this.renderInput()
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
      return this.renderFinished()
    }
  },

  renderInput: function() {
    return <div className="Wrapper">
      <div className="Main"><div className="Content">
                 <div className="Input__header">Dinner Time!</div>
          <p>Enter details of what you need to cook below and Dinner Time! will tell you when to do what.</p>
        <div className="Input">

          <table>
            <thead>
              <tr>
                <th>Cook</th>
                <th>For</th>
                <th>Tend</th>
                <th>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {this.state.items.map(function(item, index) {
                return <tr key={item.id} onChange={this.onChangeItem.bind(this, index)}>
                  <td><input type="text" name="name" value={item.name}/></td>
                  <td><input type="text" size="3" name="time" min="0" step="1" value={item.time}/> mins</td>
                  <td>
                    <select value={item.tend} name="tend">
                      <option></option>
                      <option>Flip</option>
                      <option>Rotate</option>
                    </select>{' '}
                    {item.tend && 'halfway'}{/* TODO Make configurable */}
                  </td>
                  <td>{this.state.items.length > 1 && <button type="button" onClick={this.deleteItem.bind(this, index)} title="Remove this food">
                    &times; Delete
                  </button>}</td>
                </tr>
              }.bind(this))}
            </tbody>
          </table>
          <button type="button" onClick={this.addItem} title="Add more food">+ Add More</button>

          <div className="Input__options">
            {HAS_SPEECH && <div className="Input__option">
              <label>
                <input type="checkbox" name="sayInstructions"
                  onChange={this.onChangeOption}
                  checked={this.state.sayInstructions}
                /> Say instructions aloud
              </label>
            </div>}
            <div className="Input__option">
              <label>
                <input type="checkbox" name="playStepSound"
                  onChange={this.onChangeOption}
                  checked={this.state.playStepSound}
                /> Play a sound for new steps
              </label>
            </div>
            <button type="button" onClick={this.startCooking}>Start Cooking</button>
          </div>
        </div>
      </div></div>
    </div>
  },

  renderFinished: function() {
    return <div className="Wrapper">
      <div className="Main"><div className="Content">
        <div className="Finished">It's Dinner Time!</div>
      </div></div>
    </div>
  }
})

React.render(<DinnerTime/>, document.getElementById('app'))
