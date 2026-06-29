// One AdditiveVoice renders a single note from a preset definition by
// creating one sine OscillatorNode per partial, each with its own gain
// envelope, summed into a shared output. This is what makes inharmonic,
// per-partial decay times possible (needed for convincing bell sounds),
// which a single PeriodicWave oscillator cannot do.
//
// Preset shape (see presets-data.js for full examples and preset-store.js
// for validation):
// {
//   name, baseFrequencyDefault, oneShot, outputGainDb,
//   filter: { type, frequency, q } | null,
//   envelope: { attack, decay, sustain, release, attackCurve, decayCurve, releaseCurve },
//   pitchGlide: { startRatio, endRatio, duration, curve } | absent,
//   partials: [ { ratio, amplitude, detuneCents, envelope? } ]
// }
//
// pitchGlide, if present, slides every partial's frequency together: each
// partial goes from (baseFrequency * pitchGlide.startRatio * partial.ratio)
// to (baseFrequency * pitchGlide.endRatio * partial.ratio) over
// pitchGlide.duration seconds, so the whole sound sweeps in pitch while the
// partials stay locked to each other proportionally. endRatio is normally
// 1, so the glide lands exactly on whatever note was actually played.

import { MIN_GAIN, clamp, dbToLinear } from './utils.js';
import { scheduleAttackDecay, scheduleRelease, computeEnvelopeLevel } from './envelope.js';

export class AdditiveVoice {
  constructor(audioCtx, destinationNode, preset) {
    this.ctx = audioCtx;
    this.preset = preset;
    this.partials = []; // { osc, gain, env, peak }
    this.active = false;
    this.noteOnTime = 0;
    this._releaseTimer = null;
    this._stopFadeTimer = null;

    this.outputGain = audioCtx.createGain();
    this.outputGain.gain.value = dbToLinear(preset.outputGainDb ?? 0);

    let node = this.outputGain;
    if (preset.filter) {
      const filterNode = audioCtx.createBiquadFilter();
      filterNode.type = preset.filter.type || 'lowpass';
      filterNode.frequency.value = preset.filter.frequency ?? 8000;
      filterNode.Q.value = preset.filter.q ?? 0.707;
      this.outputGain.connect(filterNode);
      node = filterNode;
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
  // replaces one that is still sounding. Computes the partial's actual
  // current level the same analytical way noteOff does (see
  // computeEnvelopeLevel in envelope.js), then fades from exactly that
  // level down to silence over a few milliseconds before the oscillators
  // actually stop.
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
    }, 20);
    this.partials = [];
    this.active = false;
  }

  _scheduleHardStop(atContextTime) {
    const delayMs = Math.max(0, (atContextTime - this.ctx.currentTime) * 1000);
    this._releaseTimer = setTimeout(() => {
      for (const partial of this.partials) {
        try {
          partial.osc.stop();
        } catch (err) {
          // Already stopped.
        }
      }
    }, delayMs);
  }
}
