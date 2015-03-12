'use strict';

var forms = require('newforms')
var React = require('react')

var extend = require('./utils/extend')
var speech = require('./utils/speech')

var ItemForm = forms.Form.extend({
  name: forms.CharField(),
  time: forms.IntegerField({minValue: 1, maxLength: 3,
    widget: forms.TextInput({attrs: {size: 3}})
  }),
  tend: forms.ChoiceField({required: false, choices: ['', 'Flip', 'Rotate']}),
  errorCssClass: 'error',
  requiredCssClass: 'required',
  validCssClass: 'valid'
})

var ItemFormSet = forms.FormSet.extend({
  form: ItemForm,
  extra: 3,
  clean() {
    var cleanedData = this.cleanedData()
    if (cleanedData.length === 0) {
      throw forms.ValidationError('Add details of at least one thing to cook.')
    }
  }
})

var OptionsForm = forms.Form.extend({
  sayInstructions: forms.BooleanField({required: false, label: 'Say instructions aloud'}),
  playStepSound: forms.BooleanField({required: false, label: 'Play a sound for new steps'})
})

var Planner = React.createClass({
  propTypes: {
    onStartCooking: React.PropTypes.func.isRequired
  },

  getInitialState() {
    return {
      itemFormset: new ItemFormSet({onChange: this.onFormChange})
    , optionsForm: new OptionsForm({
        onChange: this.onFormChange
      , initial: {sayInstructions: speech.hasSpeech, playStepSound: true}
      })
    }
  },

  onFormChange() {
    this.forceUpdate()
  },

  addItem() {
    this.state.itemFormset.addAnother()
  },

  deleteItem(index) {
    this.state.itemFormset.removeForm(index)
  },

  onSubmit(e) {
    e.preventDefault()
    // Validate all forms' current input data (set by onChange events)
    var itemFormset = this.state.itemFormset
    var optionsForm = this.state.optionsForm
    if ([itemFormset.validate(),
         optionsForm.validate()].indexOf(false) != -1) {
      return this.forceUpdate()
    }
    // If we're good, call back to our parent component
    this.props.onStartCooking(extend(optionsForm.cleanedData, {
      items: itemFormset.cleanedData()
    }))
  },

  render() {
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
                {this.state.itemFormset.forms().map((itemForm, index) => {
                  var fields = itemForm.boundFieldsObj()
                  return <tr key={index} className={itemForm.notEmpty() && 'notempty'}>
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
                })}
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