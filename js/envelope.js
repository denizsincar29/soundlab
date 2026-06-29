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

// Same math a ramp from fromValue to toValue actually follows at progress
// t (0..1), for whichever curve. linearRampToValueAtTime and
// exponentialRampToValueAtTime are both fully deterministic formulas, so
// this exactly reproduces what the audio thread is computing, with no need
// to ask the AudioParam what its current value is.
function curveValueAt(fromValue, toValue, t, curve) {
  const from = Math.max(fromValue, MIN_GAIN);
  const to = Math.max(toValue, MIN_GAIN);
  if (curve === 'exponential') {
    return from * Math.pow(to / from, t);
  }
  return from + (to - from) * t;
}

// Schedules attack (0 -> peak) then decay (peak -> sustain level), starting
// at startTime on a gain that the caller has already set to MIN_GAIN. The
// param holds at the sustain level after decayEnd until something else is
// scheduled, which is exactly what scheduleRelease does later.
export function scheduleAttackDecay(param, rawEnv, startTime, peak = 1) {
  const env = normalizeEnvelope(rawEnv);
  param.setValueAtTime(MIN_GAIN, startTime);
  const attackEnd = startTime + env.attack;
  rampTo(param, peak, attackEnd, env.attackCurve);
  const decayEnd = attackEnd + env.decay;
  const sustainLevel = peak * env.sustain;
  rampTo(param, sustainLevel, decayEnd, env.decayCurve);
  return decayEnd;
}

// Computes what scheduleAttackDecay's ramp would actually read at
// elapsedSeconds after it started, purely by working out where that puts
// us on the attack, decay, or sustain segment and applying curveValueAt.
//
// This exists instead of reading AudioParam.value (or relying on
// cancelAndHoldAtTime) to find out "how loud is this partial right now"
// when interrupting a note early. In practice, querying the live value of
// a param mid-exponential-ramp is not consistently reliable across
// browsers, which was causing a release to occasionally start from the
// wrong level, an audible jump before the release ramp brought it back
// down. Computing it analytically sidesteps that entirely: the formulas
// here are the exact ones the Web Audio spec defines for linear and
// exponential ramps, so the answer matches what the audio thread is
// actually doing, deterministically, on every browser.
export function computeEnvelopeLevel(rawEnv, peak, elapsedSeconds) {
  const env = normalizeEnvelope(rawEnv);
  const sustainLevel = Math.max(peak * env.sustain, MIN_GAIN);
  if (elapsedSeconds <= 0) return MIN_GAIN;
  if (elapsedSeconds < env.attack) {
    return curveValueAt(MIN_GAIN, peak, elapsedSeconds / env.attack, env.attackCurve);
  }
  const decayElapsed = elapsedSeconds - env.attack;
  if (decayElapsed < env.decay) {
    return curveValueAt(peak, sustainLevel, decayElapsed / env.decay, env.decayCurve);
  }
  return sustainLevel;
}

// Schedules a release ramp down to silence, starting at startTime, from
// currentLevel (the note's actual level right now; see
// computeEnvelopeLevel above for how callers should get that value).
export function scheduleRelease(param, rawEnv, startTime, currentLevel) {
  const env = normalizeEnvelope(rawEnv);
  param.cancelScheduledValues(startTime);
  param.setValueAtTime(Math.max(currentLevel, MIN_GAIN), startTime);
  const releaseEnd = startTime + env.release;
  rampTo(param, MIN_GAIN, releaseEnd, env.releaseCurve);
  return releaseEnd;
}
