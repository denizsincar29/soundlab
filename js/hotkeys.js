// A small global hotkey registry. By default, bindings are ignored while
// focus is in a text field, number field, select, or textarea, so typing a
// frequency value never accidentally triggers play/stop. Pass
// { allowInFields: true } for shortcuts that must always work, such as the
// panic stop.

// Buttons are included here, not just form fields: every button on this
// page already handles its own Space/Enter activation (natively, or via its
// own click listener). Without this, a global "space" binding registered
// for one button (Wave lab's Play/Stop) would also fire while a completely
// different button (Synth preset's Play) has focus, double-triggering.
const SUPPRESSED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);

export class HotkeyManager {
  constructor() {
    this.bindings = [];
    this.enabled = true;
    this._handleKeydown = this._handleKeydown.bind(this);
    window.addEventListener('keydown', this._handleKeydown);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  register(combo, handler, { allowInFields = false } = {}) {
    this.bindings.push({ combo: combo.toLowerCase(), handler, allowInFields });
  }

  destroy() {
    window.removeEventListener('keydown', this._handleKeydown);
  }

  _handleKeydown(event) {
    if (!this.enabled) return;
    const target = event.target;
    const isSuppressed = !!target && (SUPPRESSED_TAGS.has(target.tagName) || target.isContentEditable);
    const combo = this._comboFromEvent(event);
    for (const binding of this.bindings) {
      if (binding.combo !== combo) continue;
      if (isSuppressed && !binding.allowInFields) continue;
      event.preventDefault();
      binding.handler(event);
      return;
    }
  }

  _comboFromEvent(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    let key = event.key.toLowerCase();
    if (key === ' ') key = 'space';
    parts.push(key);
    return parts.join('+');
  }
}
