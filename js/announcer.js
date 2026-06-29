// Pushes text into an aria-live region so screen readers announce app state
// changes (play/stop, presets loaded, errors) without moving focus. Use
// urgent: true sparingly, for the assertive region (errors, panic stop).

export class Announcer {
  constructor(politeEl, assertiveEl) {
    this.politeEl = politeEl;
    this.assertiveEl = assertiveEl;
  }

  say(message, { urgent = false } = {}) {
    const target = urgent ? this.assertiveEl : this.politeEl;
    if (!target) return;
    // Clearing first and forcing a reflow makes repeated identical messages
    // get re-announced instead of being silently ignored.
    target.textContent = '';
    void target.offsetWidth;
    target.textContent = message;
  }
}
