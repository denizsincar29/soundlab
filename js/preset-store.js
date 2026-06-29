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
  if (!preset.envelope && preset.partials && preset.partials.some((p) => !p.envelope)) {
    errors.push('Provide a top-level "envelope", or an "envelope" on every partial.');
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
