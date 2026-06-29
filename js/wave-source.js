// A single oscillator with a fade-in/out gain wrapper, used by the Wave lab,
// the Phase Router, and the two-device Phase Alignment tool. Supports the
// four built-in waveforms plus a "custom" mode built from a list of harmonic
// amplitudes via PeriodicWave.

export class WaveSource {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.osc = null;
    this.ampGain = audioCtx.createGain();
    this.ampGain.gain.value = 0;
    this.type = 'sine';
    this.harmonics = []; // amplitudes for harmonics 2, 3, 4, ... in order
    this.frequency = 440;
    this.running = false;
  }

  // Connect this once to wherever the tone should go (a StereoRouter's
  // connectSource, or straight to the audio engine's destination).
  get outputNode() {
    return this.ampGain;
  }

  setFrequency(freq) {
    this.frequency = freq;
    if (this.osc) {
      this.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.01);
    }
  }

  setType(type) {
    this.type = type;
    if (this.running) this._rebuildOscillator();
  }

  setHarmonics(harmonicsArray) {
    this.harmonics = harmonicsArray.slice();
    if (this.running && this.type === 'custom') this._rebuildOscillator();
  }

  start() {
    if (this.running) return;
    const ctx = this.ctx;
    this.osc = ctx.createOscillator();
    this.osc.frequency.value = this.frequency;
    this._applyWaveform(this.osc);
    this.osc.connect(this.ampGain);

    const now = ctx.currentTime;
    this.ampGain.gain.cancelScheduledValues(now);
    this.ampGain.gain.setValueAtTime(0, now);
    this.ampGain.gain.linearRampToValueAtTime(1, now + 0.02);
    this.osc.start(now);
    this.running = true;
  }

  stop() {
    if (!this.running) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.ampGain.gain.cancelScheduledValues(now);
    this.ampGain.gain.setValueAtTime(this.ampGain.gain.value, now);
    this.ampGain.gain.linearRampToValueAtTime(0, now + 0.02);
    const oscToStop = this.osc;
    setTimeout(() => {
      try {
        oscToStop.stop();
        oscToStop.disconnect();
      } catch (err) {
        // Already stopped.
      }
    }, 40);
    this.osc = null;
    this.running = false;
  }

  // The cross-device phase-alignment trick: briefly detune away from the
  // target frequency by exactly the amount needed to accumulate the desired
  // phase shift, then snap back. Because this only ever moves the frequency
  // AudioParam (never restarts the oscillator), there is no click, only a
  // very short, precisely calculated pitch blip.
  //
  // Phase shift (radians) = 2*pi * deltaFrequency * pulseDuration, so:
  //   deltaFrequency = phaseShiftRadians / (2*pi*pulseDuration)
  nudgePhase(deltaDegrees, pulseDurationSec = 0.05) {
    if (!this.osc) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const deltaRadians = (deltaDegrees * Math.PI) / 180;
    const deltaFrequency = deltaRadians / (2 * Math.PI * pulseDurationSec);
    const base = this.frequency;
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(base + deltaFrequency, now);
    this.osc.frequency.setValueAtTime(base, now + pulseDurationSec);
  }

  _applyWaveform(osc) {
    if (this.type === 'custom') {
      const n = this.harmonics.length + 2;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      imag[1] = 1; // fundamental
      this.harmonics.forEach((amp, i) => {
        imag[i + 2] = amp;
      });
      const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
      osc.setPeriodicWave(wave);
    } else {
      osc.type = this.type; // sine | square | triangle | sawtooth
    }
  }

  // Swaps in a fresh oscillator with the new waveform while one is already
  // sounding, overlapping start/stop by a few milliseconds so there is no
  // audible gap or click.
  _rebuildOscillator() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const old = this.osc;
    const next = ctx.createOscillator();
    next.frequency.value = this.frequency;
    this._applyWaveform(next);
    next.connect(this.ampGain);
    next.start(now);
    this.osc = next;
    try {
      old.stop(now);
    } catch (err) {
      // Already stopped.
    }
    setTimeout(() => {
      try {
        old.disconnect();
      } catch (err) {
        // Already disconnected.
      }
    }, 20);
  }
}
