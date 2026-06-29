// Validation and (de)serialization for synth preset JSON, used by the
// "load file" / "save file" / "apply JSON" controls in the synth panel.

const SCHEMA_ID = 'phaselab-preset@1';

export function validatePreset(preset) {
  const errors = [];
  if (!preset || typeof preset !== 'object') {
    return ['Preset must be a JSON object.'];
  }
  if (!preset.name || typeof preset.name !== 'string') {
    errors.push('Missing a "name" text field.');
  }
  if (!Array.isArray(preset.partials) || preset.partials.length === 0) {
    errors.push('Needs a non-empty "partials" array.');
  } else {
    preset.partials.forEach((partial, i) => {
      if (typeof partial.ratio !== 'number' || !(partial.ratio > 0)) {
        errors.push(`Partial ${i + 1}: "ratio" must be a positive number.`);
      }
      if (partial.amplitude !== undefined && (typeof partial.amplitude !== 'number' || partial.amplitude < 0)) {
        errors.push(`Partial ${i + 1}: "amplitude" must be a non-negative number.`);
      }
    });
  }
  if (preset.baseFrequencyDefault !== undefined && typeof preset.baseFrequencyDefault !== 'number') {
    errors.push('"baseFrequencyDefault" must be a number.');
  }
  if (preset.notes !== undefined && typeof preset.notes !== 'string') {
    errors.push('"notes" must be a string if present.');
  }
  if (preset.pitchGlide !== undefined) {
    const glide = preset.pitchGlide;
    if (!glide || typeof glide !== 'object') {
      errors.push('"pitchGlide" must be an object with startRatio, endRatio, and duration.');
    } else {
      if (typeof glide.startRatio !== 'number' || !(glide.startRatio > 0)) {
        errors.push('"pitchGlide.startRatio" must be a positive number.');
      }
      if (typeof glide.endRatio !== 'number' || !(glide.endRatio > 0)) {
        errors.push('"pitchGlide.endRatio" must be a positive number.');
      }
      if (typeof glide.duration !== 'number' || !(glide.duration > 0)) {
        errors.push('"pitchGlide.duration" must be a positive number of seconds.');
      }
    }
  }
  if (!preset.envelope && preset.partials && preset.partials.some((p) => !p.envelope)) {
    errors.push('Provide a top-level "envelope", or an "envelope" on every partial.');
  }
  if (preset.noiseBurst !== undefined) {
    const nb = preset.noiseBurst;
    if (!nb || typeof nb !== 'object') {
      errors.push('"noiseBurst" must be an object.');
    } else if (nb.amplitude !== undefined && (typeof nb.amplitude !== 'number' || nb.amplitude < 0)) {
      errors.push('"noiseBurst.amplitude" must be a non-negative number.');
    }
  }
  if (preset.filterEnvelope !== undefined) {
    const fe = preset.filterEnvelope;
    if (!fe || typeof fe !== 'object') {
      errors.push('"filterEnvelope" must be an object with startFrequency, endFrequency, and duration.');
    } else {
      if (typeof fe.startFrequency !== 'number' || !(fe.startFrequency > 0)) {
        errors.push('"filterEnvelope.startFrequency" must be a positive number.');
      }
      if (typeof fe.endFrequency !== 'number' || !(fe.endFrequency > 0)) {
        errors.push('"filterEnvelope.endFrequency" must be a positive number.');
      }
      if (typeof fe.duration !== 'number' || !(fe.duration > 0)) {
        errors.push('"filterEnvelope.duration" must be a positive number of seconds.');
      }
    }
  }
  if (preset.distortion !== undefined) {
    const dist = preset.distortion;
    if (!dist || typeof dist !== 'object') {
      errors.push('"distortion" must be an object with an "amount".');
    } else if (typeof dist.amount !== 'number' || !(dist.amount > 0)) {
      errors.push('"distortion.amount" must be a positive number.');
    }
  }
  if (preset.vibrato !== undefined) {
    const vib = preset.vibrato;
    if (!vib || typeof vib !== 'object') {
      errors.push('"vibrato" must be an object with a "rateHz".');
    } else if (typeof vib.rateHz !== 'number' || !(vib.rateHz > 0)) {
      errors.push('"vibrato.rateHz" must be a positive number.');
    }
  }
  if (preset.tremolo !== undefined) {
    const trem = preset.tremolo;
    if (!trem || typeof trem !== 'object') {
      errors.push('"tremolo" must be an object with a "rateHz".');
    } else if (typeof trem.rateHz !== 'number' || !(trem.rateHz > 0)) {
      errors.push('"tremolo.rateHz" must be a positive number.');
    }
  }
  return errors;
}

export function clonePreset(preset) {
  return JSON.parse(JSON.stringify(preset));
}

export function preparePresetForExport(preset) {
  return { schema: SCHEMA_ID, ...clonePreset(preset) };
}

// Parses and validates preset text (from a file or the JSON textarea).
// Throws an Error with a readable message on any problem.
export function parsePresetText(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`Not valid JSON: ${err.message}`);
  }
  const errors = validatePreset(data);
  if (errors.length > 0) {
    throw new Error(`Preset is invalid. ${errors.join(' ')}`);
  }
  return data;
}
