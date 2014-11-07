'use strict';

var Forms = require('newforms')
var React = require('react/addons')

var extend = require('./utils/extend')
var speech = require('./utils/speech')

var cx = React.addons.classSet

var ItemForm = Forms.Form.extend({
  name: Forms.CharField(),
  time: Forms.IntegerField({minValue: 1,maxLength: 3,
    widget: Forms.TextInput({attrs: {size: 3}})
  }),
  tend: Forms.ChoiceField({required: false, choices: ['', 'Flip', 'Rotate']}),
  errorCssClass: 'error',
  requiredCssClass: 'required',
  validCssClass: 'valid'
})

var ItemFormSet = Forms.formsetFactory(ItemForm, {extra: 3})

var OptionsForm = Forms.Form.extend({
  sayInstructions: Forms.BooleanField({required: false, label: 'Say instructions aloud'}),
  playStepSound: Forms.BooleanField({required: false, label: 'Play a sound for new steps'})
})

var Planner = React.createClass({
  propTypes: {
    onStartCooking: React.PropTypes.func.isRequired
  },

  getInitialState: function() {
    return {
      itemFormset: new ItemFormSet({onChange: this.onFormChange})
    , optionsForm: new OptionsForm({
        onChange: this.onFormChange
      , initial: {sayInstructions: speech.hasSpeech, playStepSound: true}
      })
    }
  },

  onFormChange: function() {
    this.forceUpdate()
  },

  addItem: function() {
    this.state.itemFormset.addAnother()
  },

  deleteItem: function(index) {
    this.state.itemFormset.removeForm(index)
  },

  onSubmit: function(e) {
    e.preventDefault()
    // Validate all forms' current input data (set by onChange events)
    var itemFormset = this.state.itemFormset
    var optionsForm = this.state.optionsForm
    if ([itemFormset.validate(),
         optionsForm.validate()].indexOf(false) != -1) {
      return this.forceUpdate()
    }
    // Validate that at least one form was filled in
    var items = itemFormset.cleanedData()
    if (items.length === 0) {
      itemFormset.addError('Add details of at least one thing to cook.')
      return this.forceUpdate()
    }
    // If we're good, call back to our parent component
    this.props.onStartCooking(extend(optionsForm.cleanedData, {items: items}))
  },

  render: function() {
    var itemCount = this.state.itemFormset.totalFormCount()
    var nonFormErrors = this.state.itemFormset.nonFormErrors()
    var optionFields = this.state.optionsForm.boundFieldsObj()
    return <div className="Wrapper">
      <div className="Main"><div className="Content">
        <div className="Input__header">Dinner Time!</div>
        <p>Enter details of what you need to cook below and Dinner Time! will tell you when to do what.</p>
        <div className="Input">
          {nonFormErrors.isPopulated() && <p className="error">{nonFormErrors.first()}</p>}
          <form onSubmit={this.onSubmit}>
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
                {this.state.itemFormset.forms().map(function(itemForm, index) {
                  var fields = itemForm.boundFieldsObj()
                  return <tr key={index} className={cx({notempty: itemForm.notEmpty()})}>
                    <td className={fields.name.cssClasses()}>{fields.name.render({attrs: {title: fields.name.errorMessage()}})}</td>
                    <td className={fields.time.cssClasses()}>{fields.time.render({attrs: {title: fields.time.errorMessage()}})} mins</td>
                    <td className={fields.tend.cssClasses()}>
                      {fields.tend.render()}{' '}
                      {fields.tend.data() && 'halfway'}{/* TODO Make configurable */}
                    </td>
                    <td>
                      {itemCount > 1 && <button type="button" onClick={this.deleteItem.bind(this, index)} title="Remove this food">
                        &times; Delete
                      </button>}
                    </td>
                  </tr>
                }.bind(this))}
              </tbody>
            </table>
            <button type="button" onClick={this.addItem} title="Add more food">+ Add More</button>

            <div className="Input__options">
              {speech.hasSpeech && <div className="Input__option">
                <label>
                  {optionFields.sayInstructions.render()}{' '}
                  {optionFields.sayInstructions.label}
                </label>
              </div>}
              <div className="Input__option">
                <label>
                  {optionFields.playStepSound.render()}{' '}
                  {optionFields.playStepSound.label}
                </label>
              </div>
            </div>
            <button type="submit">Start Cooking</button>
          </form>
        </div>
      </div></div>
    </div>
  }
})

module.exports = Planner