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
  if ('speechSynthesis' in window) {
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
    if (this.state.timeToNextStep == 5) {
      this.refs.pips.getDOMNode().currentTime = 0
      this.refs.pips.getDOMNode().play()
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
      timeElapsed: this.state.timeElapsed + timeToNextStep - 6
    , timeRemaining: this.state.timeRemaining - timeToNextStep + 6
    , timeToNextStep: 6
    })
  },

  render: function() {
    var prevSteps = this.props.steps.slice(0, this.state.stepIndex)
    var step = this.props.steps[this.state.stepIndex]
    var nextStep = this.props.steps[this.state.stepIndex + 1]
    return <div className="CookingTimer">
      <h1>Dinner Time in {hoursMinutesSeconds(this.state.timeRemaining)}</h1>
      {prevSteps.map(function(prevStep, index) {
        return <h4 key={index} className="CookingTimer_prevstep">
          DT minus {hhmmss(prevStep.time)} &ndash; {linebreaks(prevStep.instructions)}
        </h4>
      })}
      <h2 className="CookingTimer__step">
        DT minus {hhmmss(step.time)} &ndash; {linebreaks(step.instructions)}
      </h2>
      <h3 className="CookingTimer__nextstep">
        Next step in {hoursMinutesSeconds(this.state.timeToNextStep)}:
        <div className="CookingTimer__nextinstructions">
          {linebreaks(nextStep.instructions)}
        </div>
      </h3>
      <button type="button" onClick={this.fastForward.bind(this, this.state.timeToNextStep)}>Fast-Forward</button>
      <audio ref="pips">
        <source src="pips.ogg" type="audio/ogg"/>
      </audio>
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

var DinnerTime = React.createClass({
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
    return <div className={'DinnerTime DinnerTime--' + this.state.appState}>
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
      <h1>Dinner Time!</h1>
      <table>
        <thead>
          <tr>
            <th>Food</th>
            <th>Cooking Time (mins)</th>
            <th>Flip/Rotate?</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {this.state.items.map(function(item, index) {
            return <tr key={item.id} onChange={this.onChange.bind(this, index)}>
              <td><input type="text" name="name" value={item.name}/></td>
              <td><input type="number" name="time" min="0" step="1" value={item.time}/></td>
              <td>
                <input type="checkbox" name="flip" checked={item.flip}/>{' '}
                {item.flip && <select value={item.flipType} name="flipType" disabled={!item.flip}>
                  <option>Flip</option>
                  <option>Rotate</option>
                </select>}{' '}
                {item.flip && 'halfway'}{/* TODO Make configurable */}
              </td>
              <td><button type="button" onClick={this.deleteItem.bind(this, index)} title="Remove this food">&times;</button></td>
            </tr>
          }.bind(this))}
        </tbody>
      </table>
      <button type="button" onClick={this.addItem} title="Add more food">+</button>
      <p>Have you pre-heated all the things?</p>
      <button type="button" onClick={this.startCooking}>Start Cooking</button>
    </div>
  },

  renderFinished: function() {
    return <div className="Finished">
      <h1>It's Dinner Time!</h1>
    </div>
  }
})

React.render(<DinnerTime/>, document.getElementById('app'))
