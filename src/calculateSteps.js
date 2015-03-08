'use strict';

var sentenceJoin = require('./utils/sentenceJoin')

function calculateSteps(items) {
  // Add "tend" items for half the cooking time of items which need to be
  // tended to.
  items.forEach(item => {
    if (item.tend) {
      items.push({type: 'tend', name: item.name, time: item.time / 2, tendType: item.tend})
    }
  })

  // Sort items by time, descending, to get the order things need to happen in
  items.sort((a, b) => b.time - a.time)

  var steps = []

  // Walk items, generating steps with tasks and time from the end of cooking
  // they need to happen at.
  var step = null
  items.forEach(item => {
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
    if (!item.type) {
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
  steps.forEach(step => {
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

module.exports = calculateSteps