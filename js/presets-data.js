// Built-in presets for the additive synth. Each one follows the
// "phaselab-preset@1" schema documented in preset-store.js. Frequencies are
// expressed as ratios of whatever base note is played, so the same preset
// works at any pitch.
//
// Tubular Bell and Music Box use a set of slightly inharmonic, independently
// decaying partials, the same general idea used in classic additive bell
// synthesis recipes: pairs of close-but-not-quite-matching partials beat
// against each other, and the upper partials die out faster than the
// fundamental, which is what makes struck metal sound metallic instead of
// like an organ chord.

export const DEFAULT_PRESETS = [
  {
    name: 'Tubular Bell',
    description: 'Struck metal bar with inharmonic, independently decaying partials.',
    baseFrequencyDefault: 220,
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
];
