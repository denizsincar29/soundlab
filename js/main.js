import { AudioEngine } from './audio-engine.js';
import { WaveSource } from './wave-source.js';
import { StereoRouter } from './stereo-router.js';
import { PhaseAlignController } from './phase-align-controller.js';
import { Announcer } from './announcer.js';
import { HotkeyManager } from './hotkeys.js';
import { AdditiveVoice } from './additive-voice.js';
import { DEFAULT_PRESETS } from './presets-data.js';
import { clonePreset, parsePresetText, preparePresetForExport } from './preset-store.js';
import { downloadJSON, pickJSONFile } from './file-io.js';
import { parseFrequencyInput, frequencyToNoteLabel } from './note-utils.js';

const HARMONIC_COUNT = 6; // Custom waveform uses harmonics 2 through 7.

const engine = new AudioEngine();
const announcer = new Announcer(
  document.getElementById('announcer-polite'),
  document.getElementById('announcer-assertive'),
);
const hotkeys = new HotkeyManager();

let waveSource = null;
let stereoRouter = null;
let phaseAlign = null;
let currentPreset = null;
let currentVoice = null;
let synthGestureHandled = false; // true while a pointer/keyboard hold gesture is in progress on the synth play button

// ---- DOM references ----
const enableAudioBtn = document.getElementById('enable-audio-btn');
const audioStatus = document.getElementById('audio-status');
const masterVolume = document.getElementById('master-volume');
const masterVolumeValue = document.getElementById('master-volume-value');
const panicBtn = document.getElementById('panic-btn');

const waveTypeSelect = document.getElementById('wave-type');
const waveFrequencyInput = document.getElementById('wave-frequency');
const overtoneControls = document.getElementById('overtone-controls');
const wavePlayBtn = document.getElementById('wave-play-btn');

const invertRightCheckbox = document.getElementById('invert-right');
const muteLeftCheckbox = document.getElementById('mute-left');
const muteRightCheckbox = document.getElementById('mute-right');

const phaseSlider = document.getElementById('phase-slider');
const phaseSliderValue = document.getElementById('phase-slider-value');
const pulseDurationSlider = document.getElementById('pulse-duration');
const pulseDurationValue = document.getElementById('pulse-duration-value');

const presetSelect = document.getElementById('preset-select');
const baseNoteInput = document.getElementById('base-note');
const baseNoteFrequencyOutput = document.getElementById('base-note-frequency');
const synthPlayBtn = document.getElementById('synth-play-btn');
const presetLoadBtn = document.getElementById('preset-load-btn');
const presetSaveBtn = document.getElementById('preset-save-btn');
const presetJsonTextarea = document.getElementById('preset-json');
const presetApplyBtn = document.getElementById('preset-apply-btn');
const presetJsonStatus = document.getElementById('preset-json-status');

const openHotkeysBtn = document.getElementById('open-hotkeys-btn');
const closeHotkeysBtn = document.getElementById('close-hotkeys-btn');
const hotkeysDialog = document.getElementById('hotkeys-dialog');

// ---- Overtone sliders (Wave lab "Custom" waveform) ----
function buildOvertoneControls() {
  for (let i = 0; i < HARMONIC_COUNT; i++) {
    const harmonicNumber = i + 2;
    const wrapper = document.createElement('div');
    wrapper.className = 'field';

    const label = document.createElement('label');
    label.htmlFor = `overtone-${harmonicNumber}`;
    label.textContent = `Harmonic ${harmonicNumber} amplitude`;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = `overtone-${harmonicNumber}`;
    input.min = '0';
    input.max = '100';
    input.value = '0';
    input.disabled = true;

    const output = document.createElement('output');
    output.id = `${input.id}-value`;
    output.setAttribute('for', input.id);
    output.textContent = '0%';

    input.addEventListener('input', () => {
      output.textContent = `${input.value}%`;
      if (waveSource) waveSource.setHarmonics(readHarmonicAmplitudes());
    });

    wrapper.append(label, input, output);
    overtoneControls.appendChild(wrapper);
  }
}

function readHarmonicAmplitudes() {
  const values = [];
  for (let i = 0; i < HARMONIC_COUNT; i++) {
    const input = document.getElementById(`overtone-${i + 2}`);
    values.push(Number(input.value) / 100);
  }
  return values;
}

function setOvertoneControlsEnabled(enabled) {
  for (let i = 0; i < HARMONIC_COUNT; i++) {
    document.getElementById(`overtone-${i + 2}`).disabled = !enabled;
  }
}

// ---- Audio start (must run inside a user gesture) ----
async function ensureAudioStarted() {
  if (engine.isStarted) return;
  await engine.start();

  waveSource = new WaveSource(engine.ctx);
  waveSource.setFrequency(parseFloat(waveFrequencyInput.value) || 440);
  waveSource.setType(waveTypeSelect.value);
  if (waveTypeSelect.value === 'custom') waveSource.setHarmonics(readHarmonicAmplitudes());

  stereoRouter = new StereoRouter(engine.ctx, engine.destination);
  stereoRouter.connectSource(waveSource.outputNode);
  stereoRouter.setRightInverted(invertRightCheckbox.checked);
  stereoRouter.setChannelMuted('left', muteLeftCheckbox.checked);
  stereoRouter.setChannelMuted('right', muteRightCheckbox.checked);

  phaseAlign = new PhaseAlignController(waveSource, {
    pulseDurationSec: Number(pulseDurationSlider.value) / 1000,
  });

  audioStatus.textContent = 'Audio is on.';
  enableAudioBtn.textContent = 'Audio is on';
  enableAudioBtn.disabled = true;
  announcer.say('Audio started.');
}

enableAudioBtn.addEventListener('click', () => {
  ensureAudioStarted();
});

// ---- Master volume and panic ----
masterVolume.addEventListener('input', async () => {
  await ensureAudioStarted();
  const percent = Number(masterVolume.value);
  masterVolumeValue.textContent = `${percent}%`;
  engine.setMasterVolume(percent / 100);
});

function handleEscape() {
  if (hotkeysDialog.open) {
    hotkeysDialog.close();
    return;
  }
  stopEverything();
}

function stopEverything() {
  if (waveSource && waveSource.running) {
    waveSource.stop();
    wavePlayBtn.textContent = 'Play wave (Space)';
    wavePlayBtn.setAttribute('aria-pressed', 'false');
  }
  if (currentVoice) currentVoice.stopNow();
  synthGestureHandled = false;
  if (phaseAlign) {
    phaseAlign.reset();
    phaseSlider.value = '0';
    phaseSliderValue.textContent = '0 degrees';
  }
  announcer.say('All sound stopped.', { urgent: true });
}

panicBtn.addEventListener('click', stopEverything);
hotkeys.register('escape', handleEscape, { allowInFields: true });

// ---- Wave lab ----
waveTypeSelect.addEventListener('change', () => {
  const isCustom = waveTypeSelect.value === 'custom';
  setOvertoneControlsEnabled(isCustom);
  if (waveSource) {
    waveSource.setType(waveTypeSelect.value);
    if (isCustom) waveSource.setHarmonics(readHarmonicAmplitudes());
  }
  announcer.say(`Waveform set to ${waveTypeSelect.options[waveTypeSelect.selectedIndex].text}.`);
});

waveFrequencyInput.addEventListener('input', () => {
  const freq = parseFloat(waveFrequencyInput.value);
  if (!Number.isFinite(freq) || freq <= 0) return;
  if (waveSource) waveSource.setFrequency(freq);
});

function toggleWavePlay() {
  ensureAudioStarted().then(() => {
    if (waveSource.running) {
      waveSource.stop();
      wavePlayBtn.textContent = 'Play wave (Space)';
      wavePlayBtn.setAttribute('aria-pressed', 'false');
      announcer.say('Wave lab tone stopped.');
    } else {
      waveSource.start();
      wavePlayBtn.textContent = 'Stop wave (Space)';
      wavePlayBtn.setAttribute('aria-pressed', 'true');
      announcer.say(`Playing ${waveTypeSelect.value} wave at ${waveSource.frequency.toFixed(1)} hertz.`);
    }
  });
}

wavePlayBtn.addEventListener('click', toggleWavePlay);
hotkeys.register('space', toggleWavePlay);

// ---- Phase router ----
invertRightCheckbox.addEventListener('change', () => {
  if (!stereoRouter) return;
  stereoRouter.setRightInverted(invertRightCheckbox.checked);
  announcer.say(invertRightCheckbox.checked ? 'Right channel inverted: antiphase.' : 'Right channel restored: in phase.');
});

muteLeftCheckbox.addEventListener('change', () => {
  if (!stereoRouter) return;
  stereoRouter.setChannelMuted('left', muteLeftCheckbox.checked);
  announcer.say(muteLeftCheckbox.checked ? 'Left channel muted.' : 'Left channel unmuted.');
});

muteRightCheckbox.addEventListener('change', () => {
  if (!stereoRouter) return;
  stereoRouter.setChannelMuted('right', muteRightCheckbox.checked);
  announcer.say(muteRightCheckbox.checked ? 'Right channel muted.' : 'Right channel unmuted.');
});

// ---- Two-device phase alignment ----
phaseSlider.addEventListener('input', async () => {
  await ensureAudioStarted();
  const angle = Number(phaseSlider.value);
  phaseSliderValue.textContent = `${angle} degrees`;
  phaseAlign.setAngle(angle);
});

pulseDurationSlider.addEventListener('input', () => {
  const ms = Number(pulseDurationSlider.value);
  pulseDurationValue.textContent = `${ms} ms`;
  if (phaseAlign) phaseAlign.setPulseDuration(ms / 1000);
});

// ---- Synth presets ----
function populatePresetSelect() {
  DEFAULT_PRESETS.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = preset.name;
    presetSelect.appendChild(option);
  });
}

let baseNoteAnnounceTimer = null;

function loadPresetIntoUI(preset) {
  clearTimeout(baseNoteAnnounceTimer);
  currentPreset = clonePreset(preset);
  presetJsonTextarea.value = JSON.stringify(currentPreset, null, 2);
  presetJsonStatus.textContent = '';
  if (currentPreset.baseFrequencyDefault) {
    // Strip any "(+N cents)" suffix so the field stays parseable as a plain note name.
    const label = frequencyToNoteLabel(currentPreset.baseFrequencyDefault).replace(/\s*\([^)]*\)\s*$/, '');
    baseNoteInput.value = label;
  }
  updateBaseNoteFrequencyDisplay();
}

// Updates the visible Hz readout only, with no live-region announcement.
// This runs on every keystroke while typing a note name, and an
// intermediate value like "C" while typing "C5" is not actually an error,
// just unfinished input, so it should not interrupt anyone.
function updateBaseNoteFrequencyDisplay() {
  const freq = parseFrequencyInput(baseNoteInput.value);
  baseNoteFrequencyOutput.textContent = freq ? `${freq.toFixed(2)} Hz` : '';
  return freq;
}

presetSelect.addEventListener('change', () => {
  const preset = DEFAULT_PRESETS[Number(presetSelect.value)];
  loadPresetIntoUI(preset);
  announcer.say(`Loaded preset ${preset.name}, base note ${baseNoteInput.value}.`);
});

baseNoteInput.addEventListener('input', () => {
  updateBaseNoteFrequencyDisplay();
  // Debounced: only announce once typing pauses, so "could not parse" does
  // not get spoken after every single keystroke of a half-typed note name.
  clearTimeout(baseNoteAnnounceTimer);
  baseNoteAnnounceTimer = setTimeout(() => {
    const value = baseNoteInput.value.trim();
    if (value === '') return;
    const freq = parseFrequencyInput(value);
    announcer.say(freq ? `${freq.toFixed(2)} Hz.` : 'Could not understand that note or frequency yet.');
  }, 700);
});

baseNoteInput.addEventListener('blur', () => {
  clearTimeout(baseNoteAnnounceTimer);
  const value = baseNoteInput.value.trim();
  if (value !== '' && !parseFrequencyInput(value)) {
    announcer.say('Could not understand that note or frequency. Try a name like A3, or a number of Hz.', { urgent: true });
  }
});

async function synthNoteOn() {
  await ensureAudioStarted();
  const freq = parseFrequencyInput(baseNoteInput.value);
  if (!freq) {
    announcer.say('Could not understand that note. Try a name like A3, or a number of Hz.', { urgent: true });
    return;
  }
  if (currentVoice) currentVoice.stopNow();
  currentVoice = new AdditiveVoice(engine.ctx, engine.destination, currentPreset);
  const { sustainStartTime } = currentVoice.noteOn(freq);
  announcer.say(`Playing ${currentPreset.name} at ${freq.toFixed(1)} hertz.`);
  if (currentPreset.oneShot) {
    const delayMs = Math.max(0, (sustainStartTime - engine.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (currentVoice) currentVoice.noteOff();
    }, delayMs);
  }
}

function synthNoteOff() {
  if (currentVoice) currentVoice.noteOff();
}

// The synth play button has to support three different activation styles
// without double-triggering or silently doing nothing:
//
// 1. Mouse/touch press-and-hold: pointerdown starts the note, pointerup
//    stops it. Pointer capture keeps pointerup firing on this element even
//    if the cursor drifts off it while still held down, which is what the
//    previous pointerleave listener was wrongly standing in for; any small
//    mouse wobble while holding fired pointerleave and cut the note off
//    early, which is the "stops in the middle" bug.
// 2. A real keyboard with focus on the button: keydown starts the note,
//    keyup stops it, the same hold gesture as the mouse. preventDefault on
//    both stops the browser from also firing a synthetic click afterward.
// 3. A screen reader's virtual cursor (NVDA/JAWS browse mode, VoiceOver,
//    switch access): these do not deliver real pointer or key events at
//    all, only one synthetic "click" once activated, which is why play
//    silently did nothing under NVDA before. A click with no prior
//    pointer/key activity on this gesture is treated as a plain on/off
//    toggle instead of a hold, since there is no hold to detect.
synthPlayBtn.addEventListener('pointerdown', (event) => {
  try {
    synthPlayBtn.setPointerCapture(event.pointerId);
  } catch (err) {
    // Best-effort; some pointer types do not support capture.
  }
  synthGestureHandled = true;
  synthNoteOn();
});

['pointerup', 'pointercancel'].forEach((eventName) => {
  synthPlayBtn.addEventListener(eventName, () => {
    if (synthGestureHandled) {
      synthGestureHandled = false;
      synthNoteOff();
    }
  });
});

synthPlayBtn.addEventListener('keydown', (event) => {
  if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) {
    event.preventDefault();
    synthGestureHandled = true;
    synthNoteOn();
  }
});

synthPlayBtn.addEventListener('keyup', (event) => {
  if ((event.code === 'Space' || event.code === 'Enter') && synthGestureHandled) {
    event.preventDefault();
    synthGestureHandled = false;
    synthNoteOff();
  }
});

synthPlayBtn.addEventListener('click', () => {
  if (synthGestureHandled) {
    // Tail end of a pointer or keyboard gesture already handled above.
    synthGestureHandled = false;
    return;
  }
  if (currentVoice && currentVoice.active) {
    synthNoteOff();
  } else {
    synthNoteOn();
  }
});

presetApplyBtn.addEventListener('click', () => {
  try {
    const preset = parsePresetText(presetJsonTextarea.value);
    currentPreset = preset;
    presetJsonStatus.textContent = `Applied. "${preset.name}" will play on the next press.`;
    announcer.say(`Preset definition applied: ${preset.name}.`);
  } catch (err) {
    presetJsonStatus.textContent = err.message;
    announcer.say(err.message, { urgent: true });
  }
});

presetSaveBtn.addEventListener('click', () => {
  const filename = `${(currentPreset.name || 'preset').toLowerCase().replace(/\s+/g, '-')}.json`;
  downloadJSON(filename, preparePresetForExport(currentPreset));
  announcer.say(`Saved ${filename}.`);
});

presetLoadBtn.addEventListener('click', async () => {
  try {
    const text = await pickJSONFile();
    const preset = parsePresetText(text);
    loadPresetIntoUI(preset);
    announcer.say(`Loaded preset ${preset.name} from file.`);
  } catch (err) {
    announcer.say(err.message, { urgent: true });
  }
});

// ---- Hotkeys help dialog ----
function toggleHotkeysDialog() {
  if (hotkeysDialog.open) {
    hotkeysDialog.close();
  } else {
    hotkeysDialog.showModal();
  }
}
openHotkeysBtn.addEventListener('click', toggleHotkeysDialog);
closeHotkeysBtn.addEventListener('click', () => hotkeysDialog.close());
hotkeysDialog.addEventListener('close', () => openHotkeysBtn.focus());
hotkeys.register('shift+?', toggleHotkeysDialog, { allowInFields: true });

// ---- Init ----
buildOvertoneControls();
populatePresetSelect();
loadPresetIntoUI(DEFAULT_PRESETS[0]);
