// Built-in presets for the additive synth. Each one follows the
// "phaselab-preset@1" schema documented in preset-store.js and README.md.
// Frequencies are expressed as ratios of whatever base note is played, so
// the same preset works at any pitch (within reason; see each preset's
// "notes" field for its sweet spot).
//
// Every preset carries a "notes" string explaining how its partials were
// chosen and what to expect, since that information would otherwise only
// exist as a comment in this source file. JSON has no comment syntax, so
// "notes" is how that documentation survives being saved/loaded as a
// standalone .json file and shown in the preset editor's textarea.

export const DEFAULT_PRESETS = [
  {
    name: 'Tubular Bell',
    description: 'Struck metal bar with inharmonic, independently decaying partials.',
    notes: 'Ten partials at non-integer ratios of the base frequency (0.561, 0.565, 0.92, 0.923, 1.19, 1.7, 2.0, 2.74, 3.76, 4.07), loosely modeled on how real struck-bell partials are not exact harmonics. Two close pairs (0.561/0.565 and 0.92/0.923) sit a couple of cents apart so they beat slowly against each other, the classic bell shimmer. Each partial has its own, independently long, exponential decay, longest at the bottom, so the upper partials die out first while the fundamental rings on, the same direction real metal decays in. Four of the ratios are below 1, meaning those partials sit BELOW the played note (real bells have a low "hum tone" like this too); at low base frequencies that pushes them into a deep, cave-like rumble. This preset is clean and bell-like from about A5 (880 Hz) upward, which is why that is the default, and gets progressively darker and muddier below A4.',
    baseFrequencyDefault: 880,
    oneShot: true,
    outputGainDb: -4,
    filter: { type: 'lowpass', frequency: 6000, q: 0.7 },
    partials: [
      { ratio: 0.561, detuneCents: 2, amplitude: 1.0, envelope: { attack: 0.002, decay: 4.5, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 0.565, detuneCents: -2, amplitude: 0.9, envelope: { attack: 0.002, decay: 4.2, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 0.92, detuneCents: 0, amplitude: 0.85, envelope: { attack: 0.002, decay: 3.6, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 0.923, detuneCents: -3, amplitude: 0.75, envelope: { attack: 0.002, decay: 3.3, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 1.19, detuneCents: 0, amplitude: 0.7, envelope: { attack: 0.002, decay: 2.6, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 1.7, detuneCents: 0, amplitude: 0.5, envelope: { attack: 0.002, decay: 1.8, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 2.0, detuneCents: 0, amplitude: 0.45, envelope: { attack: 0.002, decay: 1.5, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 2.74, detuneCents: 0, amplitude: 0.3, envelope: { attack: 0.002, decay: 1.0, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 3.76, detuneCents: 0, amplitude: 0.2, envelope: { attack: 0.002, decay: 0.6, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 4.07, detuneCents: 0, amplitude: 0.15, envelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
    ],
  },

  {
    name: 'Music Box',
    description: 'Bright, short bell tine. Same idea as Tubular Bell, tuned smaller and faster.',
    notes: 'Five partials, all at or above the fundamental ratio (1, 3.0, 4.2, 6.0, 8.4), unlike Tubular Bell there is nothing below the played note, so there is no sub-fundamental rumble at any reasonable base frequency. Decays are much shorter (0.3 to 1.2 seconds) for a bright, quickly-dying tine instead of a long-ringing bar. Sounds clean across a wide pitch range, including low base frequencies, which is the main practical difference from Tubular Bell.',
    baseFrequencyDefault: 880,
    oneShot: true,
    outputGainDb: -2,
    filter: { type: 'lowpass', frequency: 9000, q: 0.7 },
    partials: [
      { ratio: 1, amplitude: 1.0, envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 0.1, decayCurve: 'exponential' } },
      { ratio: 3.0, detuneCents: 4, amplitude: 0.5, envelope: { attack: 0.001, decay: 1.0, sustain: 0, release: 0.1, decayCurve: 'exponential' } },
      { ratio: 4.2, amplitude: 0.35, envelope: { attack: 0.001, decay: 0.7, sustain: 0, release: 0.1, decayCurve: 'exponential' } },
      { ratio: 6.0, detuneCents: -3, amplitude: 0.2, envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.1, decayCurve: 'exponential' } },
      { ratio: 8.4, amplitude: 0.1, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1, decayCurve: 'exponential' } },
    ],
  },

  {
    name: 'Drawbar Organ',
    description: 'Tonewheel-organ style stack of harmonic drawbars with a percussive key click.',
    notes: 'A small stack of purely harmonic ratios (0.5 through 8, modeled loosely on a tonewheel organ\'s drawbars) that all share one fast, even envelope, so the tone sustains at a flat level for as long as the note is held, the opposite of a bell\'s ever-changing per-partial decay. The ratio-9 partial is not a drawbar at all: it has its own near-instant attack and decay, completely independent of the shared envelope, and exists purely as a percussive "key click" transient at the very start of the note.',
    baseFrequencyDefault: 261.63,
    oneShot: false,
    outputGainDb: -6,
    filter: null,
    envelope: { attack: 0.008, decay: 0.05, sustain: 1.0, release: 0.06, attackCurve: 'linear', decayCurve: 'linear', releaseCurve: 'linear' },
    partials: [
      { ratio: 0.5, amplitude: 0.5 },
      { ratio: 1, amplitude: 1.0 },
      { ratio: 2, amplitude: 0.7 },
      { ratio: 4, amplitude: 0.5 },
      { ratio: 6, amplitude: 0.3 },
      { ratio: 8, amplitude: 0.2 },
      {
        ratio: 9, amplitude: 0.18,
        envelope: { attack: 0.001, decay: 0.012, sustain: 0, release: 0.01, decayCurve: 'exponential' },
      },
    ],
  },

  {
    name: 'Glass Pluck',
    description: 'Bright, slightly inharmonic plucked tone with a fast percussive decay.',
    notes: 'Five partials at ratios close to, but not exactly, a harmonic series (1, 2, 3, 4.2, 6.3): close enough to sound tonal, detuned enough at the top to sound glassy rather than purely musical. One shared envelope with a fast attack, fast exponential decay, and no sustain, so it always behaves like a pluck no matter how long the play button is actually held.',
    baseFrequencyDefault: 523.25,
    oneShot: true,
    outputGainDb: -3,
    filter: { type: 'highpass', frequency: 200, q: 0.5 },
    envelope: { attack: 0.001, decay: 0.9, sustain: 0, release: 0.2, decayCurve: 'exponential' },
    partials: [
      { ratio: 1, amplitude: 1.0 },
      { ratio: 2, amplitude: 0.6 },
      { ratio: 3, amplitude: 0.4 },
      { ratio: 4.2, amplitude: 0.3 },
      { ratio: 6.3, amplitude: 0.15 },
    ],
  },

  {
    name: 'Warm Pad',
    description: 'Slow, sustaining pad with a touch of chorus-like detune on the upper partials.',
    notes: 'Four purely harmonic partials (1, 2, 3, 4), so it stays consonant at any base frequency with no rumble or beating concerns from inharmonic content. The 2nd and 3rd partials are detuned a few cents apart (+6 and -5 cents) purely for a slow, chorus-like beating, not for tuning reasons. One shared envelope with a slow attack and release and a high sustain level, meant to be held rather than tapped.',
    baseFrequencyDefault: 220,
    oneShot: false,
    outputGainDb: -5,
    filter: { type: 'lowpass', frequency: 3000, q: 0.6 },
    envelope: { attack: 0.7, decay: 0.4, sustain: 0.8, release: 1.4, attackCurve: 'linear', decayCurve: 'linear', releaseCurve: 'exponential' },
    partials: [
      { ratio: 1, amplitude: 1.0 },
      { ratio: 2, amplitude: 0.5, detuneCents: 6 },
      { ratio: 3, amplitude: 0.3, detuneCents: -5 },
      { ratio: 4, amplitude: 0.15 },
    ],
  },

  {
    name: 'Falling Bell',
    description: 'Demonstrates a pitch glide: starts two octaves above the played note and slides down onto it.',
    notes: 'Three harmonic partials (1, 2, 3) with a Glass-Pluck-like fast attack and slow exponential decay, but the interesting part is the top-level "pitchGlide" field: every partial\'s actual oscillator frequency ramps together from 4x the requested base frequency down to 1x (so it lands exactly on whatever note you played) over pitchGlide.duration seconds, using an exponential curve so the slide sounds like a constant musical interval per second rather than abrupt at either end. With the default base note (A4 / 440 Hz) this starts at A6 and lands on A4 four seconds later. pitchGlide has no UI controls yet; edit startRatio, endRatio, duration (seconds), or curve ("linear"/"exponential") directly in this preset\'s JSON below and click Apply to hear changes immediately for this session. Saving the preset keeps your edited pitchGlide values in the exported file.',
    baseFrequencyDefault: 440,
    oneShot: true,
    outputGainDb: -4,
    filter: { type: 'lowpass', frequency: 5000, q: 0.7 },
    pitchGlide: { startRatio: 4, endRatio: 1, duration: 4, curve: 'exponential' },
    envelope: { attack: 0.01, decay: 4.0, sustain: 0, release: 0.3, decayCurve: 'exponential' },
    partials: [
      { ratio: 1, amplitude: 1.0 },
      { ratio: 2, amplitude: 0.5, envelope: { attack: 0.01, decay: 3.3, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 3, amplitude: 0.3, envelope: { attack: 0.01, decay: 2.6, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
    ],
  },
];
