'use strict';

var hasSpeech = ('speechSynthesis' in window)

function speak(text) {
  if (hasSpeech) {
    speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  }
}

module.exports = {
  hasSpeech: hasSpeech
, speak: speak
}