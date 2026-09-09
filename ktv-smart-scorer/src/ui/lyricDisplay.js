/**
 * lyricDisplay.js
 * Drives the per-character karaoke subtitle color-change effect using a
 * timeline from lyrics.json.
 *
 * Exports: initLyricDisplay, updateLyrics, resetLyrics
 */

/**
 * Initialises the lyric display with a DOM container element and lyric data.
 * Clears the container, builds <p>/<span> DOM structure, and returns a
 * LyricState object with a flat span array for efficient per-frame updates.
 *
 * @param {HTMLElement} container
 * @param {LyricLine[]} lyrics
 * @returns {LyricState}
 *
 * LyricState: { container: HTMLElement, spans: Array<{ span: HTMLElement, start: number, end: number, active: boolean }> }
 */
export function initLyricDisplay(container, lyrics) {
  // Clear any existing content
  container.innerHTML = '';

  // Flat array of span state objects for O(n) per-frame updates
  const spans = [];

  for (const line of lyrics) {
    const p = document.createElement('p');

    for (const charEntry of line.chars) {
      const span = document.createElement('span');
      span.textContent = charEntry.char;

      // Store timing on the element as data attributes for debuggability
      span.dataset.start = charEntry.start;
      span.dataset.end = charEntry.end;

      p.appendChild(span);

      // Push into flat state array
      spans.push({
        span,
        start: charEntry.start,
        end: charEntry.end,
        active: false,
      });
    }

    container.appendChild(p);
  }

  return { container, spans };
}

/**
 * Updates which character spans are highlighted based on currentTimeMs.
 * Only touches the DOM when a span's active state actually needs to change
 * (avoids thrashing classList on every frame).
 *
 * @param {LyricState} state
 * @param {number} currentTimeMs
 * @returns {void}
 */
export function updateLyrics(state, currentTimeMs) {
  for (const entry of state.spans) {
    const shouldBeActive = entry.start <= currentTimeMs && currentTimeMs < entry.end;

    // Only update the DOM when state changes
    if (shouldBeActive !== entry.active) {
      if (shouldBeActive) {
        entry.span.classList.add('active');
      } else {
        entry.span.classList.remove('active');
      }
      entry.active = shouldBeActive;
    }
  }
}

/**
 * Resets all lyric highlighting — removes the `active` class from every span
 * and resets the active flag in state. Called on STOP.
 *
 * @param {LyricState} state
 * @returns {void}
 */
export function resetLyrics(state) {
  for (const entry of state.spans) {
    if (entry.active) {
      entry.span.classList.remove('active');
      entry.active = false;
    }
  }
}
