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

  {
    name: 'Nylon Guitar',
    description: 'Plucked nylon string with pick noise and a brightness sweep.',
    notes: 'Eight harmonic partials with amplitude roughly falling off as 1/n, the typical spectrum of a string plucked away from its very middle, and decay times that shorten for higher harmonics, since high-frequency string vibration loses energy to air and the body faster than the fundamental does. A short noiseBurst (bandpass around 3.2kHz) adds the fingertip/nail transient at the very start. A filterEnvelope sweeps an auto-created lowpass from 5.5kHz down to 900Hz over 2.5 seconds, on top of the amplitude decay, which is what actually sells "plucked string" rather than "bell": the tone gets duller, not just quieter, as it rings out. No sustain; it always behaves like a pluck regardless of how long the play button is held.',
    baseFrequencyDefault: 220,
    oneShot: true,
    outputGainDb: -3,
    noiseBurst: { amplitude: 0.25, filterType: 'bandpass', filterFrequency: 3200, filterQ: 0.8, attack: 0.001, decay: 0.04, decayCurve: 'exponential' },
    filterEnvelope: { startFrequency: 5500, endFrequency: 900, duration: 2.5, curve: 'exponential' },
    partials: [
      { ratio: 1, amplitude: 1.0, envelope: { attack: 0.002, decay: 3.2, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 2, amplitude: 0.55, envelope: { attack: 0.002, decay: 2.6, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 3, amplitude: 0.38, envelope: { attack: 0.002, decay: 2.1, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 4, amplitude: 0.28, envelope: { attack: 0.002, decay: 1.7, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 5, amplitude: 0.2, envelope: { attack: 0.002, decay: 1.4, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 6, amplitude: 0.16, envelope: { attack: 0.002, decay: 1.1, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 7, amplitude: 0.12, envelope: { attack: 0.002, decay: 0.9, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 8, amplitude: 0.09, envelope: { attack: 0.002, decay: 0.7, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
    ],
  },

  {
    name: 'Electric Guitar',
    description: 'Overdriven electric guitar: pick attack, mild distortion, finger vibrato, and amp tremolo.',
    notes: 'Same 1/n-falloff plucked-string idea as Nylon Guitar, but longer decays (electric strings plus amp sustain ring longer than nylon) and a sharper, highpass-filtered pick click instead of a soft bandpass thump. Three more layers on top: distortion (a tanh soft-clip waveshaper, amount 4, a warm overdrive rather than a full fuzz) is the difference between "guitar" and "electric guitar"; vibrato (6Hz, 12 cents, fading in after 0.2s, like a player adding finger vibrato partway through a held note) wobbles every partial together; tremolo (5Hz, 12% depth) is the classic amp tremolo-circuit wobble in volume, independent of the vibrato in pitch. The filterEnvelope sweeps brighter and longer (7kHz to 1.2kHz over 3.5s) than the nylon guitar, matching how magnetic pickups emphasize more top end at the attack.',
    baseFrequencyDefault: 293.66,
    oneShot: true,
    outputGainDb: -6,
    distortion: { amount: 4 },
    vibrato: { rateHz: 6, depthCents: 12, delay: 0.2 },
    tremolo: { rateHz: 5, depth: 0.12 },
    noiseBurst: { amplitude: 0.3, filterType: 'highpass', filterFrequency: 4000, filterQ: 0.7, attack: 0.001, decay: 0.025, decayCurve: 'exponential' },
    filterEnvelope: { startFrequency: 7000, endFrequency: 1200, duration: 3.5, curve: 'exponential' },
    partials: [
      { ratio: 1, amplitude: 1.0, envelope: { attack: 0.002, decay: 4.5, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 2, amplitude: 0.6, envelope: { attack: 0.002, decay: 3.8, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 3, amplitude: 0.45, envelope: { attack: 0.002, decay: 3.0, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 4, amplitude: 0.25, envelope: { attack: 0.002, decay: 2.4, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 5, amplitude: 0.18, envelope: { attack: 0.002, decay: 1.9, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 6, amplitude: 0.14, envelope: { attack: 0.002, decay: 1.5, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 7, amplitude: 0.1, envelope: { attack: 0.002, decay: 1.1, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
      { ratio: 8, amplitude: 0.07, envelope: { attack: 0.002, decay: 0.8, sustain: 0, release: 0.15, decayCurve: 'exponential' } },
    ],
  },

  {
    name: 'Violin',
    description: 'Bowed string: slow bow-catch attack, sustained while held, with prominent vibrato.',
    notes: 'Unlike the plucked instruments above, this is meant to be pressed and held, like an actual bow stroke: attack is slower (0.12s, the bow gripping the string rather than an instant pluck) and sustain is high (0.85) so the tone holds steady for as long as you hold the button, with a fairly quick release (0.3s) for the bow lifting off. Vibrato is much more prominent than the guitar presets (6Hz, 28 cents) and fades in over its first third of a second, the classic delayed vibrato of a sustained bowed note. A brief noiseBurst (bandpass around 3kHz, 70ms) stands in for the bow catching the string at the very start; be aware this engine only supports one-shot noise transients, so it cannot model the continuous bow noise a real violin has for the whole note, only that initial catch. Default base note is A4, the violin\'s open A string.',
    baseFrequencyDefault: 440,
    oneShot: false,
    outputGainDb: -5,
    filter: { type: 'lowpass', frequency: 6000, q: 0.6 },
    vibrato: { rateHz: 6, depthCents: 28, delay: 0.3 },
    noiseBurst: { amplitude: 0.18, filterType: 'bandpass', filterFrequency: 3000, filterQ: 1.2, attack: 0.005, decay: 0.07, decayCurve: 'exponential' },
    envelope: { attack: 0.12, decay: 0.15, sustain: 0.85, release: 0.3, attackCurve: 'linear', decayCurve: 'linear', releaseCurve: 'exponential' },
    partials: [
      { ratio: 1, amplitude: 1.0 },
      { ratio: 2, amplitude: 0.7 },
      { ratio: 3, amplitude: 0.55 },
      { ratio: 4, amplitude: 0.4 },
      { ratio: 5, amplitude: 0.3 },
      { ratio: 6, amplitude: 0.22 },
      { ratio: 7, amplitude: 0.16 },
      { ratio: 8, amplitude: 0.1 },
    ],
  },

  {
    name: 'Crystal Bell',
    description: 'High, glassy bell with a very long shimmering decay and an evolving brightness sweep.',
    notes: 'Five partials at near-harmonic ratios (1, 2.01, 3, 4.02, 6), with two of them detuned by a single cent so they beat extremely slowly against their neighbor across the whole multi-second decay, the shimmer. What really sets this apart from Tubular Bell is the filterEnvelope: it sweeps an auto-created lowpass from a very open 9kHz down to 1.2kHz over the full 8-second decay, so the tone is glassy and bright right at the strike and gradually darkens as it rings out, on top of (not instead of) each partial fading on its own separate schedule. High default pitch (C6) keeps it sounding crystalline rather than cavernous.',
    baseFrequencyDefault: 1046.5,
    oneShot: true,
    outputGainDb: -3,
    filterEnvelope: { startFrequency: 9000, endFrequency: 1200, duration: 8, curve: 'exponential' },
    partials: [
      { ratio: 1, amplitude: 1.0, envelope: { attack: 0.002, decay: 9, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 2.01, detuneCents: 1, amplitude: 0.6, envelope: { attack: 0.002, decay: 7, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 3, amplitude: 0.4, envelope: { attack: 0.002, decay: 5, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 4.02, detuneCents: -1, amplitude: 0.25, envelope: { attack: 0.002, decay: 3.5, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
      { ratio: 6, amplitude: 0.12, envelope: { attack: 0.002, decay: 2, sustain: 0, release: 0.3, decayCurve: 'exponential' } },
    ],
  },

  {
    name: 'Church Bell',
    description: 'Big, deep bell with an extra sub-fundamental partial and a very long decay.',
    notes: 'Built on the same idea as Tubular Bell (inharmonic ratios, a couple of detuned pairs that beat slowly, independent per-partial decay), extended with a ratio-0.3 partial well below everything else for the massive low "thud" a large cast bell has underneath its ring, and roughly twice the decay times throughout. Here a low default pitch (A2) is exactly the point, unlike Tubular Bell where it was the problem; a church bell is supposed to sound cavernous. A static warm lowpass plus a slow filterEnvelope (7kHz to 2kHz over 6 seconds) tame the harsher upper partials as it settles.',
    baseFrequencyDefault: 110,
    oneShot: true,
    outputGainDb: -5,
    filter: { type: 'lowpass', frequency: 7000, q: 0.6 },
    filterEnvelope: { startFrequency: 7000, endFrequency: 2000, duration: 6, curve: 'exponential' },
    partials: [
      { ratio: 0.3, amplitude: 0.6, envelope: { attack: 0.004, decay: 10, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
      { ratio: 0.561, detuneCents: 2, amplitude: 1.0, envelope: { attack: 0.002, decay: 9, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
      { ratio: 0.565, detuneCents: -2, amplitude: 0.9, envelope: { attack: 0.002, decay: 8.5, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
      { ratio: 0.92, amplitude: 0.85, envelope: { attack: 0.002, decay: 7, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
      { ratio: 0.923, detuneCents: -3, amplitude: 0.75, envelope: { attack: 0.002, decay: 6.5, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
      { ratio: 1.19, amplitude: 0.7, envelope: { attack: 0.002, decay: 5, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
      { ratio: 1.7, amplitude: 0.5, envelope: { attack: 0.002, decay: 3.5, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
      { ratio: 2.0, amplitude: 0.45, envelope: { attack: 0.002, decay: 3, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
      { ratio: 2.74, amplitude: 0.3, envelope: { attack: 0.002, decay: 2, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
      { ratio: 3.76, amplitude: 0.2, envelope: { attack: 0.002, decay: 1.2, sustain: 0, release: 0.4, decayCurve: 'exponential' } },
    ],
  },
];
