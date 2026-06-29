// Small reusable pieces shared by AdditiveVoice for noise bursts and
// distortion, kept in their own module so the core additive-synthesis path
// in additive-voice.js stays easy to read.

const noiseBufferCache = new WeakMap(); // AudioContext -> AudioBuffer

// A one-second white-noise buffer, generated once per AudioContext and
// reused for every noiseBurst on every voice. Regenerating random samples
// on every single note would be wasted work, and the loop seam on a full
// second of white noise is inaudible since it has no periodic structure
// to begin with.
export function getNoiseBuffer(ctx) {
  let buffer = noiseBufferCache.get(ctx);
  if (buffer) return buffer;
  const length = ctx.sampleRate;
  buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBufferCache.set(ctx, buffer);
  return buffer;
}

// A simple tanh-based soft-clip curve for a WaveShaperNode, used for the
// "distortion" preset field (overdriven electric guitar and similar).
// Normalized by tanh(amount) so an input of +/-1 always maps to an output
// of +/-1 regardless of drive amount; without that, higher drive would
// also creep the output level up, making "amount" double as an unwanted
// volume knob.
export function makeDistortionCurve(amount) {
  const drive = Math.max(amount, 0.0001);
  const sampleCount = 2048;
  const curve = new Float32Array(sampleCount);
  const normalizer = Math.tanh(drive) || 1;
  for (let i = 0; i < sampleCount; i++) {
    const x = (i / (sampleCount - 1)) * 2 - 1; // -1..1
    curve[i] = Math.tanh(x * drive) / normalizer;
  }
  return curve;
}
