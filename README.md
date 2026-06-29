# Phase Lab

A browser-only Web Audio playground for waveforms, phase/antiphase, and
additive synthesis. Plain HTML and ES6 modules, no build step, no
dependencies. Open `index.html` in a browser (or serve the folder over
http/https; some browsers restrict Web Audio or ES module imports on the
`file://` scheme).

## Sections

### Wave lab
One oscillator. Pick sine, square, triangle, sawtooth, or Custom (built from
the harmonic 2-7 amplitude sliders into a `PeriodicWave`). Set frequency
directly in Hz.

### Phase router
Takes the Wave lab tone and duplicates it onto both stereo channels through
a `ChannelMergerNode`, with the right channel's gain switchable between +1
(in phase) and -1 (antiphase). Inverting the right channel does not cancel
anything over headphones, since each ear only hears its own channel. The
point is to demonstrate what *would* happen if the two channels were summed,
for example through a mono speaker, a shared cable run, or by standing where
both speakers reach one ear equally.

### Two-device phase alignment
The practical version of "play 440 Hz on the PC, play 440 Hz on the phone,
nudge one of them until they cancel." A real cross-device phase lock is not
possible from a web page: each device runs its own independent
`AudioContext` clock with no shared time reference, so even identical
frequencies will drift apart over time.

The slider instead implements exactly the trick described in the brief, made
precise: briefly detune the oscillator away from its target frequency for a
fraction of a second, by exactly the amount needed to accumulate the desired
phase shift, then return to the original frequency. Because this only
changes the oscillator's `frequency` AudioParam (never stops or restarts the
oscillator), there's no click, just a short, calculated pitch blip.

The math (see `nudgePhase` in `js/wave-source.js`):

```
phase shift (radians) = 2 * pi * delta_frequency * pulse_duration
delta_frequency        = phase_shift_radians / (2 * pi * pulse_duration)
```

Dragging the slider computes the shortest angular delta from its last
position (handling 0/360 wraparound) and fires one nudge pulse per change, so
it feels like turning a continuous phase knob rather than jumping to
absolute values. The pulse length slider trades off speed against
smoothness: shorter pulses need a larger momentary frequency offset for the
same phase shift, which is more audible as a "blip."

In practice: play the same frequency on both devices, walk between them, and
use the slider to slide the phase around until you find the quietest spot.

### Synth presets
An additive synthesizer (see `js/additive-voice.js`): every note is built
from a list of partials, each a plain sine oscillator with its own gain
envelope, all summed together. This is what makes convincing bells
possible: real struck-metal sounds have inharmonic partials that ring out at
different rates, which a single oscillator (even with a rich waveform)
cannot reproduce, but a stack of independently-decaying sines can.

Six built-in presets:

- **Tubular Bell** and **Music Box**: many partials at non-integer frequency
  ratios, several detuned a few cents from their neighbor to beat slowly,
  each with its own (long, exponential) decay time and no sustain. Tubular
  Bell defaults to A5 since several of its partials sit below the played
  note (real bell behavior, a "hum tone"), which gets boomy at low pitches.
- **Drawbar Organ**: a small stack of harmonic ratios (sub-octave through the
  8th harmonic) that sustain evenly while held, plus one extra partial with
  an instant attack and decay used only as a percussive "key click"
  transient.
- **Glass Pluck**: a handful of bright, slightly inharmonic partials with a
  fast exponential decay and no sustain.
- **Warm Pad**: a few harmonic partials with a slow attack/release and a
  couple of partials detuned for a chorus-like shimmer.
- **Falling Bell**: a short bell-ish tone with a `pitchGlide` (see below)
  that slides every partial from four times the played frequency down to
  the played frequency itself over 4 seconds; with the default base note
  it audibly goes from A6 down to A4.

Every preset has a `notes` field explaining exactly how its partial ratios,
detunes, and envelopes were chosen and what its practical range is (JSON
has no comment syntax, so this is how that documentation travels with a
saved/loaded `.json` file). Read it in the JSON textarea after selecting a
preset.

Play by name or frequency in the "base note" field (accepts `A3`, `C#4`,
`220`, etc). Sustaining presets (Drawbar Organ, Warm Pad) respond to
press-and-hold; one-shot presets (the bells, the pluck, and Falling Bell)
auto-release themselves once their slowest partial finishes decaying, so a
single click or tap is enough.

#### Preset JSON schema

```jsonc
{
  "schema": "phaselab-preset@1",
  "name": "My Bell",
  "notes": "How this preset's partials and envelopes were chosen, and its practical pitch range. Optional, but the built-ins all have one.",
  "baseFrequencyDefault": 220,
  "oneShot": true,
  "outputGainDb": -4,
  "filter": { "type": "lowpass", "frequency": 6000, "q": 0.7 }, // or null
  "envelope": {                 // used by any partial that omits its own
    "attack": 0.01, "decay": 1.5, "sustain": 0, "release": 0.3,
    "attackCurve": "linear", "decayCurve": "exponential", "releaseCurve": "exponential"
  },
  "pitchGlide": {                // optional; omit entirely for a static pitch
    "startRatio": 4, "endRatio": 1, "duration": 4, "curve": "exponential"
  },
  "partials": [
    { "ratio": 1, "amplitude": 1.0, "detuneCents": 0 },
    { "ratio": 2.756, "amplitude": 0.6, "envelope": { "attack": 0.01, "decay": 1.0, "sustain": 0, "release": 0.2 } }
  ]
}
```

`ratio` multiplies the base frequency and does not need to be an integer
(non-integer ratios are how inharmonic, bell-like timbres happen).
`detuneCents` adds fine detune on top of that, handy for slow beating
between two close partials.

`pitchGlide` slides every partial's actual frequency together over time:
each partial goes from `baseFrequency * startRatio * partial.ratio` to
`baseFrequency * endRatio * partial.ratio` across `duration` seconds, so
the whole sound sweeps in pitch while every partial stays locked to the
others proportionally (it never goes inharmonic mid-glide). `endRatio` is
usually `1`, so the glide lands exactly on whatever note you actually
played. `curve` is `"linear"` (constant Hz/second) or `"exponential"`
(constant musical interval/second, which is what a natural-sounding pitch
sweep almost always wants). There is no dedicated slider for this yet;
edit the four fields directly in the JSON textarea and click Apply to hear
changes immediately in the current session, or Save to keep them in a
`.json` file.

Edit any preset's JSON directly in the "advanced editing" textarea and
click Apply, or load/save a `.json` file with the buttons above it. Files
exported from the app already match this schema, including the six
built-ins under `presets/`.

## Hotkeys

| Key | Action |
|---|---|
| Space | Play/stop the Wave lab tone (ignored while typing in a text field) |
| Escape | Close an open dialog, or stop all sound immediately |
| Shift+? | Open/close the hotkeys help dialog |
| Arrow keys | Adjust whichever slider has focus (native range behavior) |

All hotkeys are convenience shortcuts on top of fully standard, fully
tabbable form controls; nothing requires using a hotkey. State changes
(play/stop, preset loaded, errors, panic stop) are pushed into an
`aria-live` region via `js/announcer.js` so they're announced without
moving focus.

## Accessibility notes (press-and-hold buttons under a screen reader)

The synth play button needs to support a hold gesture (sustain while held)
for mouse and touch, but a screen reader's virtual cursor (NVDA/JAWS browse
mode, VoiceOver, switch access) never delivers real pointer or key events
for an activation, only one synthetic `click`. The button in
`js/main.js` handles all of these without double-triggering:

1. `pointerdown`/`pointerup`/`pointercancel` with `setPointerCapture()` for
   mouse and touch hold. Capturing the pointer matters: without it,
   `pointerup` (or the `pointerleave` some implementations use instead) can
   fire early if the cursor drifts off the button while still held, cutting
   the note off mid-decay even though the button is still physically
   pressed.
2. `keydown`/`keyup` (with `preventDefault`) for a real keyboard, same hold
   gesture.
3. A `click` listener as the catch-all: if a click arrives with no prior
   pointer/key activity on this gesture (set/cleared by a shared flag), it
   is a synthetic AT activation, so it is treated as a simple on/off toggle
   instead of a hold, since there is nothing to hold.

## Module layout

```
index.html
css/style.css
js/
  utils.js                  shared math helpers (dB, clamp, gain floor)
  note-utils.js             note name <-> frequency <-> MIDI
  envelope.js                ADSR scheduling against an AudioParam
  audio-engine.js            AudioContext lifecycle + master bus/limiter
  wave-source.js             single oscillator: waveform, overtones, phase nudge
  stereo-router.js           duplicate-to-both-channels + invert/mute
  phase-align-controller.js  slider-delta -> phase-nudge-pulse logic
  additive-voice.js          multi-partial synth voice (noteOn/noteOff)
  presets-data.js            the five built-in presets
  preset-store.js            preset validation, clone, JSON (de)serialize
  file-io.js                 save-as-file / open-file-picker helpers
  announcer.js                aria-live wrapper
  hotkeys.js                  global keyboard shortcut registry
  main.js                     wires all of the above to the DOM
presets/*.json               the five built-ins, exported to disk for reference
```

Every module is a focused, independently readable piece: audio graph nodes,
envelope math, and DOM wiring are kept apart so any one of them can be
reused (or replaced) without touching the rest.
