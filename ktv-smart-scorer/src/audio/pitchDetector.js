/**
 * pitchDetector.js
 * Implements a lightweight YIN-inspired autocorrelation algorithm to extract
 * the fundamental frequency (f0) from a PCM time-domain buffer.
 * Converts Hz to MIDI note number and note name.
 *
 * Exports: detectPitch, hzToMidi, midiToNoteName, midiToHz
 */

// The 12 canonical pitch class names in semitone order (C = 0, B = 11)
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Converts a frequency in Hz to the nearest MIDI note number.
 * Uses the equal-temperament formula: MIDI = round(69 + 12 * log2(hz / 440))
 * where MIDI 69 = A4 = 440 Hz.
 *
 * @param {number} hz - Frequency in Hz (must be > 0)
 * @returns {number} Nearest integer MIDI note number (0–127)
 */
export function hzToMidi(hz) {
  return Math.round(69 + 12 * Math.log2(hz / 440));
}

/**
 * Converts a MIDI note number to a human-readable note name in scientific
 * pitch notation (e.g. 60 → "C4", 69 → "A4", 70 → "A#4").
 *
 * Octave is computed as floor(midi / 12) - 1, so MIDI 0 = "C-1".
 *
 * @param {number} midi - Integer MIDI note number (0–127)
 * @returns {string} Note name, e.g. "C3", "G#4", "A#5"
 */
export function midiToNoteName(midi) {
  const pitchClass = midi % 12;           // 0–11 index into NOTE_NAMES
  const octave = Math.floor(midi / 12) - 1; // scientific pitch octave
  return NOTE_NAMES[pitchClass] + octave;
}

/**
 * Converts a MIDI note number to its exact frequency in Hz.
 * This is the inverse of hzToMidi (for integer MIDI values the round-trip
 * hzToMidi(midiToHz(n)) === n holds exactly).
 *
 * Formula: hz = 440 * 2^((midi - 69) / 12)
 *
 * @param {number} midi - MIDI note number (may be fractional for sub-semitone precision)
 * @returns {number} Frequency in Hz
 */
export function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ---------------------------------------------------------------------------
// Pitch detection (YIN-inspired autocorrelation)
// ---------------------------------------------------------------------------

/**
 * Computes the sum-of-products autocorrelation for a given lag τ.
 *
 * @param {Float32Array} buffer
 * @param {number} tau - Lag in samples
 * @returns {number}
 */
function autocorrelate(buffer, tau) {
  let sum = 0;
  const len = buffer.length - tau;
  for (let i = 0; i < len; i++) {
    sum += buffer[i] * buffer[i + tau];
  }
  return sum;
}

/**
 * Refines the best-lag estimate using parabolic interpolation to achieve
 * sub-sample accuracy.
 *
 * @param {Float32Array} buffer
 * @param {number} tau - Integer lag at peak
 * @returns {number} Sub-sample refined lag
 */
function parabolicInterpolate(buffer, tau) {
  // Guard against boundary conditions
  if (tau <= 0 || tau >= buffer.length - 1) return tau;

  const prev = autocorrelate(buffer, tau - 1);
  const curr = autocorrelate(buffer, tau);
  const next = autocorrelate(buffer, tau + 1);

  const denom = 2 * (2 * curr - prev - next);
  if (denom === 0) return tau;

  return tau + (prev - next) / denom;
}

/**
 * Runs autocorrelation-based f0 detection on a PCM buffer.
 * Returns null if no confident pitch is found (signal too weak or noisy).
 *
 * @param {Float32Array} buffer - PCM samples (mono, float32 -1.0..1.0)
 * @param {number} sampleRate - e.g. 44100 or 48000
 * @param {Object} [options]
 * @param {number} [options.minHz=80]              - lower search bound
 * @param {number} [options.maxHz=1200]            - upper search bound
 * @param {number} [options.clarityThreshold=0.9]  - normalised correlation threshold
 * @returns {{ hz: number, midi: number, midiExact: number, noteName: string } | null}
 */
export function detectPitch(buffer, sampleRate, options = {}) {
  const {
    minHz = 80,
    maxHz = 1200,
    clarityThreshold = 0.9,
  } = options;

  const tauMin = Math.floor(sampleRate / maxHz);
  const tauMax = Math.floor(sampleRate / minHz);

  // Normalisation term (zero-lag autocorrelation = signal energy)
  const r0 = autocorrelate(buffer, 0);
  if (r0 === 0) return null; // silent buffer

  // Step 1: find the lag that maximises the normalised autocorrelation
  let bestTau = -1;
  let bestCorrelation = 0;

  for (let tau = tauMin; tau <= tauMax; tau++) {
    // Loop invariant: bestCorrelation is the maximum normalised correlation
    // seen so far for all τ' in [tauMin, tau)
    const normalised = autocorrelate(buffer, tau) / r0;
    if (normalised > bestCorrelation) {
      bestCorrelation = normalised;
      bestTau = tau;
    }
  }

  // Step 2: check clarity threshold — reject weak or noisy signals
  if (bestCorrelation < clarityThreshold) return null;

  // Step 3: sub-sample refinement via parabolic interpolation
  const refinedTau = parabolicInterpolate(buffer, bestTau);

  // Step 4: convert lag → Hz → MIDI → note name
  // Clamp hz to [minHz, maxHz] — parabolic interpolation can nudge the refined
  // tau slightly outside the integer tau range, which would produce an hz value
  // just outside the search bounds.  Requirement 5.6 / Property 8 mandate that
  // result.hz is always within [minHz, maxHz].
  const hz = Math.min(maxHz, Math.max(minHz, sampleRate / refinedTau));
  const midiExact = 69 + 12 * Math.log2(hz / 440);
  const midi = Math.round(midiExact);
  const noteName = midiToNoteName(midi);

  return { hz, midi, midiExact, noteName };
}
