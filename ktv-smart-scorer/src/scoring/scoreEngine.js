/**
 * scoreEngine.js
 * Loads MIDI note timeline data, evaluates the user's detected pitch against
 * the current target note(s), and accumulates a session score.
 *
 * Exports: initScoreEngine, evaluate, getVisibleNotes
 */

/**
 * Initialises score engine state with the provided note timeline.
 *
 * @param {NoteEntry[]} notes - Array of note entries from notes.json
 * @returns {ScoreEngineState}
 *
 * ScoreEngineState shape:
 * {
 *   notes: NoteEntry[],
 *   score: number,
 *   totalHits: number,
 *   totalEvaluations: number,
 *   lastResult: EvaluationResult | null
 * }
 */
export function initScoreEngine(notes) {
  return {
    notes: notes,
    score: 0,
    totalHits: 0,
    totalEvaluations: 0,
    lastResult: null,
  };
}

/**
 * Evaluates the user's detected pitch against the active target note at
 * the given playback time. Updates the state in place and returns the result.
 *
 * Hit condition: |detectedMidiExact - targetNote.pitch| <= 0.5 semitones
 * Score increments by +10 per hit; score never decreases.
 *
 * @param {ScoreEngineState} state
 * @param {number} currentTimeMs - playback position in milliseconds
 * @param {number | null} detectedMidiExact - continuous MIDI value, or null if no pitch
 * @returns {EvaluationResult}
 *
 * EvaluationResult shape:
 * {
 *   isHit: boolean,
 *   isInWindow: boolean,       // true when a target note covers currentTimeMs
 *   targetNote: NoteEntry | null,
 *   detectedMidiExact: number | null,
 *   semitoneError: number | null,  // null when no target or no pitch
 *   score: number                  // current accumulated score after this call
 * }
 */
export function evaluate(state, currentTimeMs, detectedMidiExact) {
  // Always count this call regardless of whether it's a hit or miss
  state.totalEvaluations += 1;

  // Find the first note whose window covers currentTimeMs
  const targetNote = state.notes.find(
    (n) => n.start <= currentTimeMs && currentTimeMs < n.end
  ) ?? null;

  const isInWindow = targetNote !== null;

  // No target note active, or user isn't singing — always a miss
  if (!targetNote || detectedMidiExact === null) {
    state.lastResult = {
      isHit: false,
      isInWindow,
      targetNote,
      detectedMidiExact,
      semitoneError: null,
      score: state.score,
    };
    return state.lastResult;
  }

  // Measure pitch accuracy in semitones
  const semitoneError = Math.abs(detectedMidiExact - targetNote.pitch);

  // Hit tolerance is exactly ±0.5 semitones (inclusive)
  const isHit = semitoneError <= 0.5;

  if (isHit) {
    state.score += 10;
    state.totalHits += 1;
  }

  state.lastResult = {
    isHit,
    isInWindow: true,
    targetNote,
    detectedMidiExact,
    semitoneError,
    score: state.score,
  };
  return state.lastResult;
}

/**
 * Returns every note that overlaps the lookahead window
 * [currentTimeMs, currentTimeMs + windowMs).
 *
 * A note overlaps when:
 *   note.end > currentTimeMs  (note hasn't fully passed yet)
 *   note.start < currentTimeMs + windowMs  (note starts before window closes)
 *
 * Used by the canvas renderer to know which bars to draw.
 *
 * @param {ScoreEngineState} state
 * @param {number} currentTimeMs - current playback position in ms
 * @param {number} windowMs - lookahead length in ms (e.g. 3000)
 * @returns {NoteEntry[]}
 */
export function getVisibleNotes(state, currentTimeMs, windowMs) {
  return state.notes.filter(
    (note) =>
      note.end > currentTimeMs &&
      note.start < currentTimeMs + windowMs
  );
}
