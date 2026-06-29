// Conversions between note names ("A4"), MIDI numbers, and frequencies in Hz.

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

// Accepts forms like "A4", "C#3", "Eb2". Returns a frequency in Hz, or null if
// the text does not look like a note name at all (caller can then try a plain
// number instead).
export function noteNameToFrequency(name) {
  const match = /^([A-Ga-g])(#|b)?(-?\d+)$/.exec(String(name).trim());
  if (!match) return null;
  const [, letterRaw, accidental, octaveStr] = match;
  let index = NOTE_NAMES.indexOf(letterRaw.toUpperCase());
  if (accidental === '#') index += 1;
  if (accidental === 'b') index -= 1;
  index = ((index % 12) + 12) % 12;
  const octave = parseInt(octaveStr, 10);
  const midi = (octave + 1) * 12 + index;
  return midiToFrequency(midi);
}

// Returns a human readable label such as "A4" or "A4 (+13 cents)" for an
// arbitrary frequency, rounding to the nearest semitone and reporting the
// remaining offset in cents.
export function frequencyToNoteLabel(freq) {
  if (!(freq > 0)) return 'unknown';
  const midi = Math.round(frequencyToMidi(freq));
  const exactFreq = midiToFrequency(midi);
  const centsOff = Math.round(1200 * Math.log2(freq / exactFreq));
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  const centsLabel = centsOff === 0 ? '' : ` (${centsOff > 0 ? '+' : ''}${centsOff} cents)`;
  return `${name}${octave}${centsLabel}`;
}

// Tries a note name first ("A3"), then falls back to a plain numeric Hz
// value ("220"). Returns null if neither parse succeeds.
export function parseFrequencyInput(text) {
  const byName = noteNameToFrequency(text);
  if (byName !== null && Number.isFinite(byName)) return byName;
  const byNumber = parseFloat(text);
  if (Number.isFinite(byNumber) && byNumber > 0) return byNumber;
  return null;
}
