// Owns the single AudioContext for the page. Browsers require a user
// gesture before audio can start, so start() is called from a click
// handler. A DynamicsCompressorNode sits on the master bus as a safety
// limiter, since stacking many additive partials and multiple modules can
// otherwise clip.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.limiter = null;
  }

  get isStarted() {
    return this.ctx !== null;
  }

  // Creates the AudioContext on first call, or resumes it if a previous
  // browser policy had it suspended. Must be called from inside a user
  // gesture handler (click, keydown, etc).
  async start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return this.ctx;
    }
    const ContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new ContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 12;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.2;

    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    return this.ctx;
  }

  // The shared bus every sound-producing module should connect into.
  get destination() {
    return this.masterGain;
  }

  setMasterVolume(linear01) {
    if (!this.masterGain) return;
    const value = Math.max(0, Math.min(1, linear01));
    this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
  }
}
