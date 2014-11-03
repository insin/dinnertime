'use strict';

var React = require('react/addons')

var AppStates = require('./AppStates')
var calculateSteps = require('./calculateSteps')
var CookingTimer = require('./CookingTimer')
var Finished = require('./Finished')

var makeObj = require('./utils/makeObj')
var speech = require('./utils/speech')

var idSeed = 1

var DinnerTime = React.createClass({
  getInitialState: function() {
    return {
      appState: AppStates.INPUT
    , items: [{id: idSeed++, type: 'food', name: '', time: '', tend: ''}]
    , schedule: null
    , sayInstructions: speech.hasSpeech
    , playStepSound: true
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
      return <Finished/>
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
                  <td><input type="text" size="3" maxLength="3" name="time" min="0" step="1" value={item.time}/> mins</td>
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
            {speech.hasSpeech && <div className="Input__option">
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
  }
})

module.exports = DinnerTime