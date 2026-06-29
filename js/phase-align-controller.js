// Tracks a 0-359 degree slider position and converts each change into the
// shortest-path angular delta (handling wraparound at the 0/360 boundary),
// which it forwards to a WaveSource as a phase-nudge pulse. This is what
// makes dragging the phase slider feel like turning a continuous knob
// instead of jumping to absolute values.

export class PhaseAlignController {
  constructor(waveSource, { pulseDurationSec = 0.05 } = {}) {
    this.waveSource = waveSource;
    this.pulseDurationSec = pulseDurationSec;
    this.lastAngle = 0;
  }

  setPulseDuration(seconds) {
    this.pulseDurationSec = seconds;
  }

  // Call with the slider's new absolute value (0-359). Returns the signed
  // delta in degrees that was actually applied, for UI feedback.
  setAngle(newAngleDegrees) {
    const wrapped = ((newAngleDegrees % 360) + 360) % 360;
    let delta = wrapped - this.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (Math.abs(delta) > 0.01) {
      this.waveSource.nudgePhase(delta, this.pulseDurationSec);
    }
    this.lastAngle = wrapped;
    return delta;
  }

  reset() {
    this.lastAngle = 0;
  }
}
