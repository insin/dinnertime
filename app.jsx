'use strict';

var AppStates = {
  INPUT: 'input'
, COOKING: 'cooking'
, FINISHED: 'finished'
}

var idSeed = 1

function calculateSteps(items) {
  // Add "flip" items for half the cooking time of items which need to be
  // flipped.
  items.forEach(function(item) {
    if (item.flip) {
      items.push({type: 'flip', name: item.name, time: item.time / 2, flipType: item.flipType})
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
    else if (item.type == 'flip') {
      if (item.flipType == 'Flip') {
        step.flip.push(item.name)
      }
      else if (item.flipType == 'Rotate') {
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

  steps.push({type: 'finish', time: 0})

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
  if ('speechSynthesis' in window) {
    speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  }
}

function minutesAndSeconds(seconds) {
  var mins = Math.floor(seconds / 60)
  var secs = seconds % 60
  if (mins == 0) {
    return secs + ' second' + pluralise(secs)
  }
  if (secs == 0) {
    return mins + ' minute' + pluralise(mins)
  }
  return mins + ' minute' + pluralise(mins) + ' ' + secs + ' second' + pluralise(secs)
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
  },

  announceStep: function(step) {
    announce(step.instructions.split('\n').join('. '))
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
      timeElapsed: this.state.timeElapsed + timeToNextStep - 2
    , timeRemaining: this.state.timeRemaining - timeToNextStep + 2
    , timeToNextStep: 2
    })
  },

  render: function() {
    var step = this.props.steps[this.state.stepIndex]
    var nextStep = this.props.steps[this.state.stepIndex + 1]
    var timeToNextStep = this.state.timeRemaining - nextStep.time
    return <div className="CookingTimer">
      <div className="CookingTimer__elapsed">
        {minutesAndSeconds(this.state.timeElapsed)} elapsed
      </div>
      <div className="CookingTimer__step">
        {linebreaks(step.instructions)}
      </div>
      <div className="CookingTimer__nextstep">
        {minutesAndSeconds(this.state.timeToNextStep)} until next step
      </div>
      <button type="button" onClick={this.fastForward.bind(this, this.state.timeToNextStep)}>Fast-Forward</button>
    </div>
  }
})

var TEST_ITEMS = [
  {id: 'a', type: 'food', name: 'Pizza', time: 22, flip: true, flipType: 'Rotate'}
, {id: 'b', type: 'food', name: 'Fish Fingers', time: 15, flip: true, flipType: 'Flip'}
, {id: 'c', type: 'food', name: 'Potato Waffles', time: 15, flip: true, flipType: 'Flip'}
, {id: 'd', type: 'food', name: 'Rice', time: 12, flip: false, flipType: 'Flip'}
, {id: 'e', type: 'food', name: 'Beans', time: 5, flip: false, flipType: 'Flip'}
]

var App = React.createClass({
  getInitialState: function() {
    return {
      appState: AppStates.INPUT
    // , items: [{id: idSeed++, type: 'food', name: '', time: '', flip: false, flipType: 'Flip'}]
    , items: TEST_ITEMS
    , schedule: null
    }
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (prevState.appState != AppStates.FINISHED && this.state.appState == AppStates.FINISHED) {
      announce('So tasty!')
    }
  },

  onChange: function(index, e) {
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

  addItem: function() {
    this.setState({
      items: React.addons.update(this.state.items, {
        $push: [{id: idSeed++, type: 'food', name: '', time: '', flip: false, flipType: 'Flip'}]
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
    return <div className="App">
      <h1>Dinner Time!</h1>
      {this.renderContent()}
    </div>
  },

  renderContent: function() {
    if (this.state.appState == AppStates.INPUT) {
      return this.renderInput()
    }
    else if (this.state.appState == AppStates.COOKING) {
      return <CookingTimer steps={this.state.steps} onFinishedCooking={this.handleFinishedCooking}/>
    }
    else if (this.state.appState == AppStates.FINISHED) {
      return this.renderFinished()
    }
  },

  renderInput: function() {
    return <div className="Input">
      {this.state.items.map(function(item, index) {
        return <div className="Input__item" key={item.id} onChange={this.onChange.bind(this, index)}>
          <label>Food: <input type="text" name="name" value={item.name}/></label>
          <label>Cooking time: <input type="number" name="time" min="0" step="1" value={item.time}/></label>
          <input type="checkbox" name="flip" checked={item.flip}/> <select value={item.flipType} name="flipType" disabled={!item.flip}>
            <option>Flip</option>
            <option>Rotate</option>
          </select> half-way
          <button type="button" onClick={this.deleteItem.bind(this, index)}>&times;</button>
        </div>
      }.bind(this))}
      <button type="button" onClick={this.addItem}>+</button>
      <p>Have you pre-heated all the things?</p>
      <button type="button" onClick={this.startCooking}>Start Cooking</button>
    </div>
  },

  renderFinished: function() {
    return <div className="Finished">
      <h1>Finished Cooking!</h1>
    </div>
  }
})

React.render(<App/>, document.getElementById('app'))
