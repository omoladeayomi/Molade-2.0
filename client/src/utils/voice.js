import api from '../api'

// The student's "Voice on / off" choice, shared by every page that speaks
const VOICE_KEY = 'molade_voice_on'

export function readVoiceSetting() {
  try {
    return localStorage.getItem(VOICE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveVoiceSetting(on) {
  try {
    localStorage.setItem(VOICE_KEY, on ? 'on' : 'off')
  } catch {
    // Not being able to remember the setting is fine
  }
}

// Gets Molade's voice for a sentence and starts playing it. Resolves with the Audio once it starts.
// Rejects with err.autoplayBlocked = true when the browser blocks sound until the user clicks.
export async function speakText(text) {
  const { data } = await api.post('/assistant/speak', { text }, { responseType: 'blob' })
  const audio = new Audio(URL.createObjectURL(data))
  try {
    await audio.play()
  } catch (err) {
    if (err.name === 'NotAllowedError') err.autoplayBlocked = true
    throw err
  }
  return audio
}
