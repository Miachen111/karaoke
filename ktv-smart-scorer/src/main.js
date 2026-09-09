/**
 * main.js
 * Master controller — state machine, asset loading, rAF loop, and wiring
 * all modules together. Exposes a reserved hook point for future ESP32
 * WebSocket sync.
 *
 * State machine states: 'idle' | 'loading' | 'running' | 'stopped' | 'error'
 *
 * Requirements: 12.x, 13.x, 14.x
 * Exports: (none — entry point, loaded via <script type="module">)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────────────────────

import { initAudio, getFilteredBuffer, stopAudio } from './audio/audioContext.js';
import { detectPitch } from './audio/pitchDetector.js';
import { initScoreEngine, evaluate, getVisibleNotes } from './scoring/scoreEngine.js';
import { initRenderer, renderFrame, resizeCanvas } from './ui/canvasRenderer.js';
import { initLyricDisplay, updateLyrics, resetLyrics } from './ui/lyricDisplay.js';

// ─────────────────────────────────────────────────────────────────────────────
// DOM references
// ─────────────────────────────────────────────────────────────────────────────

const startStopBtn  = document.getElementById('start-stop-btn');
const canvas        = document.getElementById('pitch-canvas');
const lyricContainer = document.getElementById('lyric-container');
const debugNote     = document.getElementById('debug-note');
const debugHz       = document.getElementById('debug-hz');
const debugScore    = document.getElementById('debug-score');
const debugHit      = document.getElementById('debug-hit');
const errorOverlay  = document.getElementById('error-overlay');
const errorMessage  = document.getElementById('error-message');
const errorDismiss  = document.getElementById('error-dismiss');

// ─────────────────────────────────────────────────────────────────────────────
// Module-level state variables
// ─────────────────────────────────────────────────────────────────────────────

/** @type {'idle' | 'loading' | 'running' | 'stopped' | 'error'} */
let appState = 'idle';

/** @type {import('./audio/audioContext.js').AudioPipelineResult | null} */
let pipeline = null;

/** @type {object | null} ScoreEngineState */
let scoreState = null;

/** @type {object | null} RendererState */
let rendererState = null;

/** @type {object | null} LyricState */
let lyricState = null;

/** @type {number | null} requestAnimationFrame handle */
let rafId = null;

/** @type {number} performance.now() reference point when song started */
let startTime = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Task 10.1 — State Machine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transitions the application to a new state and updates the UI accordingly.
 *
 * Idle / Stopped  → button label "🎤 開始演唱", enabled, no .running class
 * Loading         → button disabled (prevent double-click)
 * Running         → button label "⏹ 停止", enabled, add .running class
 * Error           → show #error-overlay with the provided message
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 3.6, 3.7
 *
 * @param {'idle' | 'loading' | 'running' | 'stopped' | 'error'} newState
 * @param {string} [errorMsg] - Required when newState === 'error'
 */
function setState(newState, errorMsg = '') {
  appState = newState;

  switch (newState) {
    case 'idle':
    case 'stopped':
      startStopBtn.textContent = '🎤 開始演唱';
      startStopBtn.disabled = false;
      startStopBtn.classList.remove('running');
      break;

    case 'loading':
      // Disable button to prevent double-clicks during async init
      startStopBtn.disabled = true;
      startStopBtn.classList.remove('running');
      break;

    case 'running':
      startStopBtn.textContent = '⏹ 停止';
      startStopBtn.disabled = false;
      startStopBtn.classList.add('running');
      break;

    case 'error':
      // Show error overlay and surface the message
      errorMessage.textContent = errorMsg;
      errorOverlay.removeAttribute('hidden');
      // Re-enable button visually back to start state (overlay covers UI)
      startStopBtn.textContent = '🎤 開始演唱';
      startStopBtn.disabled = false;
      startStopBtn.classList.remove('running');
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 10.2 — rAF Loop and Module Wiring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Starts a new karaoke session.
 * Transitions: idle/stopped → loading → running
 *
 * Must be called synchronously from within a user-gesture event handler
 * so that initAudio() can create an AudioContext under the browser's
 * autoplay policy (Requirement 3.7).
 *
 * Requirements: 12.2, 12.3, 12.4, 13.5
 */
async function start() {
  setState('loading');

  try {
    // ── Step 1: Fetch song assets in parallel ─────────────────────────────
    let notes, lyrics;
    try {
      [notes, lyrics] = await Promise.all([
        fetch('./assets/song_001/notes.json').then((r) => {
          if (!r.ok) throw new Error('notes.json fetch failed: ' + r.status);
          return r.json();
        }),
        fetch('./assets/song_001/lyrics.json').then((r) => {
          if (!r.ok) throw new Error('lyrics.json fetch failed: ' + r.status);
          return r.json();
        }),
      ]);
    } catch (_fetchErr) {
      setState('error', '無法載入歌曲資料，請確認檔案是否存在。');
      return;
    }

    // ── Step 2: Initialise audio pipeline (must stay within the gesture chain)
    try {
      pipeline = await initAudio();
    } catch (audioErr) {
      // Distinguish mic-denied from other audio errors
      const isMicDenied =
        audioErr.name === 'NotAllowedError' ||
        audioErr.name === 'PermissionDeniedError';
      setState(
        'error',
        isMicDenied
          ? '需要麥克風權限才能使用。請允許麥克風存取後再試一次。'
          : '音訊初始化失敗：' + audioErr.message,
      );
      return;
    }

    // ── Step 3: Initialise all modules ────────────────────────────────────
    scoreState = initScoreEngine(notes);

    rendererState = initRenderer(canvas, {
      midiMin: 36,
      midiMax: 72,
      scrollSpeedPxPerMs: 0.15,
      lookaheadMs: 3000,
    });

    lyricState = initLyricDisplay(lyricContainer, lyrics);

    // ── Step 4: Record start time and kick off the rAF loop ───────────────
    startTime = performance.now();
    setState('running');
    rafId = requestAnimationFrame(onAnimationFrame);

  } catch (unexpectedErr) {
    // Catch-all: any unexpected error during init
    setState('error', '發生未預期的錯誤：' + unexpectedErr.message);
  }
}

/**
 * The 60 FPS animation loop callback.
 * Orchestrates: pitch detection → score evaluation → rendering → debug UI.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 *
 * @param {DOMHighResTimeStamp} timestamp - provided by requestAnimationFrame
 */
function onAnimationFrame(timestamp) {
  // ── 1. Compute playback position ─────────────────────────────────────────
  const currentTimeMs = timestamp - startTime;

  // ── 2. Read audio buffer and detect pitch ─────────────────────────────────
  const filtered = getFilteredBuffer(pipeline.analyserNode, pipeline.buffer);
  const pitchResult = filtered
    ? detectPitch(filtered, pipeline.audioContext.sampleRate)
    : null;

  // ── 3. Evaluate score for this frame ─────────────────────────────────────
  const evalResult = evaluate(scoreState, currentTimeMs, pitchResult?.midiExact ?? null);

  // ── 4. Get visible notes for the lookahead window ─────────────────────────
  const visibleNotes = getVisibleNotes(scoreState, currentTimeMs, 3000);

  // ── 5. Render canvas frame ────────────────────────────────────────────────
  renderFrame(rendererState, currentTimeMs, visibleNotes, pitchResult, evalResult);

  // ── 6. Update lyric highlighting ──────────────────────────────────────────
  updateLyrics(lyricState, currentTimeMs);

  // ── 7. Update debug panel ─────────────────────────────────────────────────
  updateDebugPanel(pitchResult, evalResult);

  // ── 8. Reserved ESP32 sync hook ───────────────────────────────────────────
  onSyncTick(evalResult);

  // ── 9. Schedule next frame ────────────────────────────────────────────────
  rafId = requestAnimationFrame(onAnimationFrame);
}

/**
 * Stops the current karaoke session.
 * Transitions: running → stopped
 *
 * Requirements: 12.5, 3.5
 */
function stop() {
  // Cancel the pending animation frame
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Tear down the audio pipeline (stops mic track, closes AudioContext)
  if (pipeline !== null) {
    stopAudio(pipeline);
    pipeline = null;
  }

  // Clear all lyric highlights
  if (lyricState !== null) {
    resetLyrics(lyricState);
  }

  setState('stopped');
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 10.3 — Canvas resize on window resize
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resizes the canvas whenever the window dimensions change.
 * Only calls resizeCanvas when the renderer is initialised (state is
 * 'running' or 'stopped'), as rendererState is null otherwise.
 *
 * Requirements: 9.7
 */
window.addEventListener('resize', () => {
  if (rendererState !== null) {
    resizeCanvas(rendererState);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Debug panel helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates the debug panel DOM elements with the latest frame data.
 * Called every animation frame (Requirement 13.3).
 *
 * #debug-note  — detected note name, or "—" when silent
 * #debug-hz    — detected Hz (1 decimal), or "— Hz" when silent
 * #debug-score — accumulated score
 * #debug-hit   — "HIT ✓" / "MISS" / "—" with corresponding CSS classes
 *
 * @param {{ hz: number, midi: number, midiExact: number, noteName: string } | null} pitchResult
 * @param {{ isHit: boolean, isInWindow: boolean, score: number }} evalResult
 */
function updateDebugPanel(pitchResult, evalResult) {
  // Note name
  debugNote.textContent = pitchResult?.noteName ?? '—';

  // Frequency
  debugHz.textContent = pitchResult
    ? pitchResult.hz.toFixed(1) + ' Hz'
    : '— Hz';

  // Score
  debugScore.textContent = evalResult.score;

  // Hit/Miss status with CSS class toggling
  if (evalResult.isHit) {
    debugHit.textContent = 'HIT ✓';
    debugHit.classList.add('hit');
    debugHit.classList.remove('miss');
  } else if (evalResult.isInWindow) {
    debugHit.textContent = 'MISS';
    debugHit.classList.add('miss');
    debugHit.classList.remove('hit');
  } else {
    debugHit.textContent = '—';
    debugHit.classList.remove('hit');
    debugHit.classList.remove('miss');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ESP32 Sync Hook — Phase 2 reserved stub
// ─────────────────────────────────────────────────────────────────────────────

// RESERVED: Phase 2 — push evalResult via WebSocket to ESP32 display
/**
 * Called on every rAF frame with the latest evaluation result.
 * Currently a no-op stub. Phase 2 will connect a WebSocket here and
 * push score/pitch data to the ESP32 display.
 *
 * Requirements: 14.1, 14.2, 14.3
 *
 * @param {object} evalResult - EvaluationResult from scoreEngine.evaluate()
 */
function onSyncTick(evalResult) {  // eslint-disable-line no-unused-vars
  // TODO Phase 2: connect WebSocket and push evalResult here
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point — wire event listeners and initialise state machine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attaches all event listeners and sets the initial application state.
 * Called on DOMContentLoaded.
 *
 * Requirements: 12.1
 */
function init() {
  // Initialise state machine to idle
  setState('idle');

  // START / STOP toggle (Requirements 12.2, 12.5)
  startStopBtn.addEventListener('click', () => {
    if (appState === 'idle' || appState === 'stopped') {
      // start() is async but called directly inside the click handler so that
      // initAudio() → new AudioContext() satisfies the browser autoplay policy
      start();
    } else if (appState === 'running') {
      stop();
    }
    // Ignore clicks in 'loading' or 'error' states
  });

  // Error overlay dismiss → back to idle (Requirement 12.6)
  errorDismiss.addEventListener('click', () => {
    errorOverlay.setAttribute('hidden', '');
    setState('idle');
  });
}

// Kick everything off once the DOM is ready
document.addEventListener('DOMContentLoaded', init);
