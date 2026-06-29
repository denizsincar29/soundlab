// One AdditiveVoice renders a single note from a preset definition by
// creating one sine OscillatorNode per partial, each with its own gain
// envelope, summed into a shared output. This is what makes inharmonic,
// per-partial decay times possible (needed for convincing bell sounds),
// which a single PeriodicWave oscillator cannot do.
//
// Preset shape (see presets-data.js for full examples and presets-store.js
// for validation):
// {
//   name, baseFrequencyDefault, oneShot, outputGainDb,
//   filter: { type, frequency, q } | null,
//   envelope: { attack, decay, sustain, release, attackCurve, decayCurve, releaseCurve },
//   partials: [ { ratio, amplitude, detuneCents, envelope? } ]
// }

import { MIN_GAIN, clamp, dbToLinear } from './utils.js';
import { scheduleAttackDecay, scheduleRelease } from './envelope.js';

export class AdditiveVoice {
  constructor(audioCtx, destinationNode, preset) {
    this.ctx = audioCtx;
    this.preset = preset;
    this.partials = []; // { osc, gain, env }
    this.active = false;
    this._releaseTimer = null;

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
    const preset = this.preset;
    const partialCount = Math.max(preset.partials.length, 1);
    const headroom = 1 / Math.sqrt(partialCount);
    let sustainStartTime = when;

    for (const partial of preset.partials) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(Math.max(baseFrequency * partial.ratio, 1), when);
      osc.detune.setValueAtTime(partial.detuneCents ?? 0, when);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(MIN_GAIN, when);
      osc.connect(gain).connect(this.outputGain);
      osc.start(when);

      const env = partial.envelope ?? preset.envelope;
      const peak = clamp(partial.amplitude ?? 1, 0, 1) * headroom;
      const decayEnd = scheduleAttackDecay(gain.gain, env, when, peak);
      sustainStartTime = Math.max(sustainStartTime, decayEnd);

      this.partials.push({ osc, gain, env });
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
    let maxReleaseEnd = when;
    for (const partial of this.partials) {
      const releaseEnd = scheduleRelease(partial.gain.gain, partial.env, when);
      maxReleaseEnd = Math.max(maxReleaseEnd, releaseEnd);
    }
    this.active = false;
    this._scheduleHardStop(maxReleaseEnd + 0.05);
  }

  // Immediately silences and tears down this voice with no fade. Used for
  // the global panic stop and before starting a fresh note on reuse.
  stopNow() {
    clearTimeout(this._releaseTimer);
    const now = this.ctx.currentTime;
    for (const partial of this.partials) {
      try {
        partial.gain.gain.cancelScheduledValues(now);
        partial.gain.gain.value = MIN_GAIN;
        partial.osc.stop();
      } catch (err) {
        // Oscillator may already be stopped; nothing to do.
      }
      try {
        partial.osc.disconnect();
        partial.gain.disconnect();
      } catch (err) {
        // Already disconnected.
      }
    }
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
