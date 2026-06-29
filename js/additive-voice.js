// One AdditiveVoice renders a single note from a preset definition by
// creating one sine OscillatorNode per partial, each with its own gain
// envelope, summed into a shared output. This is what makes inharmonic,
// per-partial decay times possible (needed for convincing bell sounds),
// which a single PeriodicWave oscillator cannot do.
//
// On top of the core additive partials, a handful of optional preset
// fields add the texture that makes plucked strings, bowed strings, and
// electric guitar sound like themselves rather than just "bell with
// different numbers":
//
//   noiseBurst      a one-shot filtered noise transient layered in at the
//                   attack (pick/strike/bow-catch character)
//   filterEnvelope  sweeps the preset's filter cutoff over time,
//                   independent of the amplitude envelope (bright attack
//                   fading to a duller sustain/decay)
//   distortion      a WaveShaper soft-clip stage (overdriven amp tone)
//   vibrato         a shared LFO modulating every partial's pitch together
//   tremolo         an LFO modulating the voice's overall amplitude
//
// See presets-data.js for worked examples of each, and README.md for the
// full field-by-field schema.
//
// Preset shape:
// {
//   name, baseFrequencyDefault, oneShot, outputGainDb,
//   filter: { type, frequency, q } | null,
//   filterEnvelope: { startFrequency, endFrequency, duration, curve } | absent,
//   distortion: { amount } | absent,
//   vibrato: { rateHz, depthCents, delay } | absent,
//   tremolo: { rateHz, depth } | absent,
//   noiseBurst: { amplitude, filterType, filterFrequency, filterQ, attack, decay, decayCurve } | absent,
//   envelope: { attack, decay, sustain, release, attackCurve, decayCurve, releaseCurve },
//   pitchGlide: { startRatio, endRatio, duration, curve } | absent,
//   partials: [ { ratio, amplitude, detuneCents, envelope? } ]
// }

import { MIN_GAIN, clamp, dbToLinear } from './utils.js';
import { scheduleAttackDecay, scheduleRelease, computeEnvelopeLevel } from './envelope.js';
import { getNoiseBuffer, makeDistortionCurve } from './synthesis-extras.js';

export class AdditiveVoice {
  constructor(audioCtx, destinationNode, preset) {
    this.ctx = audioCtx;
    this.preset = preset;
    this.partials = []; // { osc, gain, env, peak }
    this.noise = null; // { source, filter, gain, env, peak } | null
    this.lfoNodes = []; // oscillators and gains for vibrato/tremolo, stopped on teardown
    this.active = false;
    this.noteOnTime = 0;
    this._releaseTimer = null;
    this._stopFadeTimer = null;

    this.outputGain = audioCtx.createGain();
    this.outputGain.gain.value = dbToLinear(preset.outputGainDb ?? 0);

    let node = this.outputGain;

    if (preset.distortion) {
      const shaper = audioCtx.createWaveShaper();
      shaper.curve = makeDistortionCurve(preset.distortion.amount ?? 10);
      shaper.oversample = '4x';
      node.connect(shaper);
      node = shaper;
    }

    // A static filter and a filter envelope share the same BiquadFilter:
    // the envelope just sweeps whatever filter is already there. If a
    // preset asks for filterEnvelope without a static filter, create a
    // sensible default lowpass to host it, so authors do not have to
    // remember to add a no-op filter block just to enable the sweep.
    this.filterNode = null;
    if (preset.filter) {
      this.filterNode = audioCtx.createBiquadFilter();
      this.filterNode.type = preset.filter.type || 'lowpass';
      this.filterNode.frequency.value = preset.filter.frequency ?? 8000;
      this.filterNode.Q.value = preset.filter.q ?? 0.707;
      node.connect(this.filterNode);
      node = this.filterNode;
    } else if (preset.filterEnvelope) {
      this.filterNode = audioCtx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.Q.value = 0.707;
      node.connect(this.filterNode);
      node = this.filterNode;
    }

    node.connect(destinationNode);
  }

  // Starts a new note at baseFrequency (Hz). Returns { sustainStartTime },
  // the AudioContext time at which the slowest partial reaches its sustain
  // level, useful for auto-scheduling noteOff on one-shot presets.
  noteOn(baseFrequency) {
    this.stopNow();
    const ctx = this.ctx;
    const when = ctx.currentTime;
    this.noteOnTime = when;
    const preset = this.preset;
    const partialCount = Math.max(preset.partials.length, 1);
    const headroom = 1 / Math.sqrt(partialCount);
    const glide = preset.pitchGlide;
    let sustainStartTime = when;

    // Shared vibrato LFO: one oscillator, fanned out to every partial's
    // detune AudioParam below, so the whole voice's pitch wobbles together
    // instead of each partial wobbling independently (which would sound
    // like wavering tuning rather than vibrato).
    let vibratoLfoGain = null;
    if (preset.vibrato && preset.vibrato.rateHz > 0) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = preset.vibrato.rateHz;
      vibratoLfoGain = ctx.createGain();
      const depth = preset.vibrato.depthCents ?? 20;
      const delay = Math.max(preset.vibrato.delay ?? 0, 0);
      const fadeInEnd = when + delay + 0.15;
      vibratoLfoGain.gain.setValueAtTime(0, when);
      if (delay > 0) vibratoLfoGain.gain.setValueAtTime(0, when + delay);
      vibratoLfoGain.gain.linearRampToValueAtTime(depth, fadeInEnd);
      lfo.connect(vibratoLfoGain);
      lfo.start(when);
      this.lfoNodes.push(lfo, vibratoLfoGain);
    }

    for (const partial of preset.partials) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';

      if (glide && glide.duration > 0) {
        const startFreq = Math.max(baseFrequency * glide.startRatio * partial.ratio, 1);
        const endFreq = Math.max(baseFrequency * glide.endRatio * partial.ratio, 1);
        osc.frequency.setValueAtTime(startFreq, when);
        if (glide.curve === 'linear') {
          osc.frequency.linearRampToValueAtTime(endFreq, when + glide.duration);
        } else {
          osc.frequency.exponentialRampToValueAtTime(endFreq, when + glide.duration);
        }
      } else {
        osc.frequency.setValueAtTime(Math.max(baseFrequency * partial.ratio, 1), when);
      }
      osc.detune.setValueAtTime(partial.detuneCents ?? 0, when);
      if (vibratoLfoGain) vibratoLfoGain.connect(osc.detune);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(MIN_GAIN, when);
      osc.connect(gain).connect(this.outputGain);
      osc.start(when);

      const env = partial.envelope ?? preset.envelope;
      const peak = clamp(partial.amplitude ?? 1, 0, 1) * headroom;
      const decayEnd = scheduleAttackDecay(gain.gain, env, when, peak);
      sustainStartTime = Math.max(sustainStartTime, decayEnd);

      this.partials.push({ osc, gain, env, peak });
    }

    // One-shot filtered noise burst for pick/strike/bow-catch attack
    // character. Always plays once on its own short schedule, independent
    // of preset.oneShot or how long the note ends up being held.
    if (preset.noiseBurst) {
      const nb = preset.noiseBurst;
      const source = ctx.createBufferSource();
      source.buffer = getNoiseBuffer(ctx);
      source.loop = false;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = nb.filterType || 'bandpass';
      noiseFilter.frequency.value = nb.filterFrequency ?? 2000;
      noiseFilter.Q.value = nb.filterQ ?? 1;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(MIN_GAIN, when);

      source.connect(noiseFilter).connect(noiseGain).connect(this.outputGain);

      const noiseEnv = {
        attack: nb.attack ?? 0.001,
        decay: nb.decay ?? 0.05,
        sustain: 0,
        release: 0.05,
        decayCurve: nb.decayCurve ?? 'exponential',
      };
      const peak = clamp(nb.amplitude ?? 0.3, 0, 1);
      scheduleAttackDecay(noiseGain.gain, noiseEnv, when, peak);

      source.start(when);
      source.stop(when + noiseEnv.attack + noiseEnv.decay + 0.05);

      this.noise = { source, filter: noiseFilter, gain: noiseGain, env: noiseEnv, peak };
    }

    // Filter envelope: sweeps the filter cutoff over time, independent of
    // the amplitude envelope above. This is what makes a pluck or bell
    // sound bright right at the attack and progressively duller as it
    // rings out, on top of (not instead of) its loudness fading.
    if (this.filterNode && preset.filterEnvelope) {
      const fe = preset.filterEnvelope;
      const startFreq = Math.max(fe.startFrequency ?? 6000, 20);
      const endFreq = Math.max(fe.endFrequency ?? 500, 20);
      const duration = Math.max(fe.duration ?? 2, 0.05);
      this.filterNode.frequency.setValueAtTime(startFreq, when);
      if (fe.curve === 'linear') {
        this.filterNode.frequency.linearRampToValueAtTime(endFreq, when + duration);
      } else {
        this.filterNode.frequency.exponentialRampToValueAtTime(endFreq, when + duration);
      }
    }

    // Tremolo: an LFO added on top of the voice's static output gain, so
    // it swings between roughly (1-depth) and (1+depth) of that level
    // rather than between 0 and the static level.
    if (preset.tremolo && preset.tremolo.rateHz > 0) {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = preset.tremolo.rateHz;
      const depth = clamp(preset.tremolo.depth ?? 0.3, 0, 1);
      const depthGain = ctx.createGain();
      depthGain.gain.value = this.outputGain.gain.value * depth;
      lfo.connect(depthGain).connect(this.outputGain.gain);
      lfo.start(when);
      this.lfoNodes.push(lfo, depthGain);
    }

    this.active = true;
    return { sustainStartTime };
  }

  // Releases the currently sounding note. Safe to call more than once, and
  // safe to call after a one-shot preset has already auto-stopped itself.
  noteOff() {
    if (!this.active) return;
    const ctx = this.ctx;
    const when = ctx.currentTime;
    const elapsed = when - this.noteOnTime;
    let maxReleaseEnd = when;
    for (const partial of this.partials) {
      const currentLevel = computeEnvelopeLevel(partial.env, partial.peak, elapsed);
      const releaseEnd = scheduleRelease(partial.gain.gain, partial.env, when, currentLevel);
      maxReleaseEnd = Math.max(maxReleaseEnd, releaseEnd);
    }
    this.active = false;
    this._scheduleHardStop(maxReleaseEnd + 0.05);
  }

  // Silences this voice quickly but without an audible click, then tears
  // it down. Used for the global panic stop and whenever a new note
  // replaces one that is still sounding. Computes each partial's (and the
  // noise burst's) actual current level the same analytical way noteOff
  // does, then fades from exactly that level down to silence over a few
  // milliseconds before anything actually stops.
  stopNow() {
    clearTimeout(this._releaseTimer);
    clearTimeout(this._stopFadeTimer);
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const elapsed = now - this.noteOnTime;
    const fadeOutEnd = now + 0.012;

    const partialsToStop = this.partials;
    for (const partial of partialsToStop) {
      try {
        const currentLevel = computeEnvelopeLevel(partial.env, partial.peak, elapsed);
        partial.gain.gain.cancelScheduledValues(now);
        partial.gain.gain.setValueAtTime(Math.max(currentLevel, MIN_GAIN), now);
        partial.gain.gain.linearRampToValueAtTime(MIN_GAIN, fadeOutEnd);
      } catch (err) {
        // Already torn down; nothing to fade.
      }
    }

    const noiseToStop = this.noise;
    if (noiseToStop) {
      try {
        const currentLevel = computeEnvelopeLevel(noiseToStop.env, noiseToStop.peak, elapsed);
        noiseToStop.gain.gain.cancelScheduledValues(now);
        noiseToStop.gain.gain.setValueAtTime(Math.max(currentLevel, MIN_GAIN), now);
        noiseToStop.gain.gain.linearRampToValueAtTime(MIN_GAIN, fadeOutEnd);
      } catch (err) {
        // Already torn down.
      }
    }

    const lfoNodesToStop = this.lfoNodes;
    this._stopFadeTimer = setTimeout(() => {
      for (const partial of partialsToStop) {
        try {
          partial.osc.stop();
          partial.osc.disconnect();
          partial.gain.disconnect();
        } catch (err) {
          // Already stopped/disconnected.
        }
      }
      if (noiseToStop) {
        try {
          noiseToStop.source.stop();
        } catch (err) {
          // Already stopped.
        }
        try {
          noiseToStop.filter.disconnect();
          noiseToStop.gain.disconnect();
        } catch (err) {
          // Already disconnected.
        }
      }
      for (const lfoNode of lfoNodesToStop) {
        try {
          if (lfoNode.stop) lfoNode.stop();
        } catch (err) {
          // Already stopped.
        }
        try {
          lfoNode.disconnect();
        } catch (err) {
          // Already disconnected.
        }
      }
    }, 20);

    this.partials = [];
    this.noise = null;
    this.lfoNodes = [];
    this.active = false;
  }

  _scheduleHardStop(atContextTime) {
    const delayMs = Math.max(0, (atContextTime - this.ctx.currentTime) * 1000);
    const lfoNodesToStop = this.lfoNodes;
    this._releaseTimer = setTimeout(() => {
      for (const partial of this.partials) {
        try {
          partial.osc.stop();
        } catch (err) {
          // Already stopped.
        }
      }
      for (const lfoNode of lfoNodesToStop) {
        try {
          if (lfoNode.stop) lfoNode.stop();
        } catch (err) {
          // Already stopped.
        }
      }
    }, delayMs);
  }
}
