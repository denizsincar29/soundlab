// ADSR scheduling against a live AudioParam (typically a GainNode's .gain).
// Each function returns the AudioContext time at which its phase finishes,
// so callers can chain decay -> sustain -> release or schedule auto-stops.

import { MIN_GAIN, clamp } from './utils.js';

export function normalizeEnvelope(env) {
  return {
    attack: Math.max(env?.attack ?? 0.01, 0.001),
    decay: Math.max(env?.decay ?? 0.2, 0.001),
    sustain: clamp(env?.sustain ?? 0.6, 0, 1),
    release: Math.max(env?.release ?? 0.3, 0.001),
    attackCurve: env?.attackCurve === 'exponential' ? 'exponential' : 'linear',
    decayCurve: env?.decayCurve === 'linear' ? 'linear' : 'exponential',
    releaseCurve: env?.releaseCurve === 'linear' ? 'linear' : 'exponential',
  };
}

function rampTo(param, value, time, curve) {
  const target = Math.max(value, MIN_GAIN);
  if (curve === 'exponential') {
    param.exponentialRampToValueAtTime(target, time);
  } else {
    param.linearRampToValueAtTime(target, time);
  }
}

// Cancels future automation and holds the param at whatever its value
// actually is right now, so the next ramp starts from the true current
// level. This matters a lot mid-decay: reading param.value directly while
// an exponentialRampToValueAtTime is in flight is not reliable across
// browsers (some report the ramp's eventual target instead of the live
// interpolated value), which used to make releasing a note mid-decay snap
// the gain back up to its peak for an instant, audible click, before the
// release ramp brought it back down. cancelAndHoldAtTime is built exactly
// for this and is supported in all current browsers.
function pinCurrentValue(param, time) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(time);
  } else {
    param.cancelScheduledValues(time);
    param.setValueAtTime(Math.max(param.value, MIN_GAIN), time);
  }
}

// Schedules attack (0 -> peak) then decay (peak -> sustain level), starting
// at startTime. The param holds at the sustain level after decayEnd until
// something else is scheduled, which is exactly what scheduleRelease does
// later for a held note.
export function scheduleAttackDecay(param, rawEnv, startTime, peak = 1) {
  const env = normalizeEnvelope(rawEnv);
  pinCurrentValue(param, startTime);
  const attackEnd = startTime + env.attack;
  rampTo(param, peak, attackEnd, env.attackCurve);
  const decayEnd = attackEnd + env.decay;
  const sustainLevel = peak * env.sustain;
  rampTo(param, sustainLevel, decayEnd, env.decayCurve);
  return decayEnd;
}

// Schedules a release ramp down to silence, starting at startTime. Works
// whether the note was sustaining or still mid-decay, because pinCurrentValue
// holds the actual live level rather than assuming a peak.
export function scheduleRelease(param, rawEnv, startTime) {
  const env = normalizeEnvelope(rawEnv);
  pinCurrentValue(param, startTime);
  const releaseEnd = startTime + env.release;
  rampTo(param, MIN_GAIN, releaseEnd, env.releaseCurve);
  return releaseEnd;
}
