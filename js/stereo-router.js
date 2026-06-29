// Duplicates one mono source onto both stereo channels, with the right
// channel independently invertible and either channel independently
// mutable. This is the in-phase/antiphase demonstration: the same signal,
// sample for sample, fed to both channels, just with one branch flipped.

export class StereoRouter {
  constructor(audioCtx, destinationNode) {
    this.ctx = audioCtx;
    this.leftGain = audioCtx.createGain();
    this.rightGain = audioCtx.createGain();
    this.merger = audioCtx.createChannelMerger(2);

    this.leftGain.connect(this.merger, 0, 0);
    this.rightGain.connect(this.merger, 0, 1);
    this.merger.connect(destinationNode);

    this.rightInverted = false;
    this.leftMuted = false;
    this.rightMuted = false;
  }

  connectSource(node) {
    node.connect(this.leftGain);
    node.connect(this.rightGain);
  }

  setRightInverted(inverted) {
    this.rightInverted = inverted;
    this._applyRightGain();
  }

  setChannelMuted(side, muted) {
    if (side === 'left') {
      this.leftMuted = muted;
      this._applyLeftGain();
    } else {
      this.rightMuted = muted;
      this._applyRightGain();
    }
  }

  _applyLeftGain() {
    const value = this.leftMuted ? 0 : 1;
    this.leftGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
  }

  _applyRightGain() {
    const polarity = this.rightInverted ? -1 : 1;
    const value = this.rightMuted ? 0 : polarity;
    this.rightGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
  }
}
