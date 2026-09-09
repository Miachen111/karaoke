# Implementation Plan: Real-Time Karaoke Scoring & Multimedia Web Engine (ktv-smart-scorer)

## Overview

Implement the ktv-smart-scorer as a pure browser ES-module application with no build tools. The implementation proceeds bottom-up: static assets first, then the audio pipeline, pitch detector, score engine, UI renderers, and finally the main controller that wires everything together. Property-based tests use fast-check loaded via CDN in a separate test HTML file.

---

## Tasks

- [x] 1. Create static assets and project skeleton
  - Create the directory structure: `assets/song_001/`, `src/audio/`, `src/scoring/`, `src/ui/`
  - Create `assets/song_001/notes.json` with a C3–G3 ascending scale (5 notes, 1000ms each, MIDI pitches 48–55)
  - Create `assets/song_001/lyrics.json` with at least one lyric line, per-character timing aligned with the notes timeline
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Implement `src/audio/pitchDetector.js`
  - [x] 2.1 Implement `hzToMidi(hz)` and `midiToNoteName(midi)` conversion utilities
    - Use formula `Math.round(69 + 12 * Math.log2(hz / 440))` for `hzToMidi`
    - Use the 12-element note name array `["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]`
    - Compute octave as `Math.floor(midi / 12) - 1`
    - Export both as named ES module exports
    - _Requirements: 6.1, 6.2, 6.3_

  - [x]* 2.2 Write property test for MIDI↔Hz round trip (Property 1)
    - **Property 1: MIDI↔Hz Round Trip**
    - For any MIDI integer n in [0,127], `hzToMidi(midiToHz(n)) === n`
    - Also test `midiToNoteName` returns string matching `/^[A-G]#?-?\d+$/` for all 128 values
    - **Validates: Requirements 6.1, 6.2**

  - [x] 2.3 Implement `detectPitch(buffer, sampleRate, options)` autocorrelation algorithm
    - Compute tau range: `tauMin = floor(sampleRate / maxHz)`, `tauMax = floor(sampleRate / minHz)`
    - Loop over tau values, computing sum-of-products autocorrelation `r[tau]`
    - Normalise by `r[0]` to get clarity score; return `null` if best clarity < `clarityThreshold`
    - Apply parabolic interpolation on the best tau for sub-sample frequency accuracy
    - Convert refined tau to `hz`, `midiExact`, `midi`, `noteName`; return `PitchResult`
    - Do NOT mutate the input buffer
    - Export `detectPitch` as named ES module export
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x]* 2.4 Write property tests for pitch detection (Properties 8, 9)
    - **Property 8: Autocorrelation Pitch Bounds** — for any non-null result, `result.hz` is within `[minHz, maxHz]` and `result.midi === Math.round(69 + 12 * Math.log2(result.hz / 440))`
    - **Property 9: Input Buffer Immutability** — buffer contents unchanged after `detectPitch()` call
    - Use fast-check to generate synthetic sine-wave buffers at known frequencies
    - **Validates: Requirements 5.5, 5.6, 5.7**

- [x] 3. Checkpoint — Verify pitch detector
  - Ensure all tests pass. Manually verify in browser console: `detectPitch` on a 440Hz sine buffer should return A4 (midi=69). Ask the user if questions arise.

- [x] 4. Implement `src/audio/audioContext.js`
  - [x] 4.1 Implement `initAudio()` — mic acquisition and Web Audio chain setup
    - Call `navigator.mediaDevices.getUserMedia({ audio: true })`
    - Create `AudioContext`, `BiquadFilterNode` (type `'bandpass'`, frequency 440, Q 3.5), `AnalyserNode` (fftSize 2048)
    - Connect chain: `MediaStreamSource → BiquadFilterNode → AnalyserNode`
    - Allocate and return a reusable `Float32Array` buffer of length `analyserNode.fftSize`
    - Return an `AudioPipelineResult` object: `{ audioContext, analyserNode, sourceNode, stream, buffer }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

  - [x] 4.2 Implement `getFilteredBuffer(analyserNode, buffer, rmsThreshold)` RMS noise gate
    - Call `analyserNode.getFloatTimeDomainData(buffer)` to populate the reusable buffer
    - Compute RMS as `Math.sqrt(buffer.reduce((s, x) => s + x*x, 0) / buffer.length)`
    - Return `null` if `rms < rmsThreshold`; return `buffer` otherwise
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.3 Implement `stopAudio(pipeline)` teardown
    - Stop all tracks on `pipeline.stream`
    - Close `pipeline.audioContext`
    - _Requirements: 3.5_

  - [x]* 2.5 Write property test for noise gate (Property 7)
    - **Property 7: Noise Gate Boundary** — for any Float32Array, `getFilteredBuffer` returns null iff RMS < threshold, and returns the buffer iff RMS >= threshold
    - Mock the `AnalyserNode.getFloatTimeDomainData` to inject test buffers
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [x] 5. Implement `src/scoring/scoreEngine.js`
  - [x] 5.1 Implement `initScoreEngine(notes)` and `getVisibleNotes(state, currentTimeMs, windowMs)`
    - `initScoreEngine`: store notes array, initialize `score=0`, `totalHits=0`, `totalEvaluations=0`, `lastResult=null`
    - `getVisibleNotes`: return all notes where `note.end > currentTimeMs && note.start < currentTimeMs + windowMs`
    - Export both as named ES module exports
    - _Requirements: 7.1, 8.1, 8.2_

  - [x]* 5.2 Write property test for visible notes window (Property 6)
    - **Property 6: Visible Notes Window Correctness** — for any time/window, every returned note satisfies `note.end > currentTimeMs && note.start < currentTimeMs + windowMs`
    - Use fast-check to generate arbitrary notes arrays and time values
    - **Validates: Requirements 8.1, 8.2**

  - [x] 5.3 Implement `evaluate(state, currentTimeMs, detectedMidiExact)`
    - Increment `state.totalEvaluations` by 1
    - Find active note: first note where `n.start <= currentTimeMs < n.end`
    - If no target note or `detectedMidiExact === null`: set `isHit = false`, return result without changing score
    - Compute `semitoneError = Math.abs(detectedMidiExact - targetNote.pitch)`
    - If `semitoneError <= 0.5`: set `isHit = true`, increment `state.score += 10`, increment `state.totalHits`
    - Return full `EvaluationResult` object with all required fields
    - Export as named ES module export
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x]* 5.4 Write property tests for score engine (Properties 2, 3, 5)
    - **Property 2: Score Monotonicity** — for any sequence of evaluate() calls, score never decreases and changes by exactly 0 or +10
    - **Property 3: Hit Detection Boundary** — isHit iff |midiExact - targetPitch| <= 0.5, for any float pair
    - **Property 5: Evaluation Count Monotonicity** — totalEvaluations increases by exactly 1 per call; totalHits <= totalEvaluations always
    - Use fast-check to generate arbitrary note arrays, time values, and midiExact values
    - **Validates: Requirements 7.2, 7.4, 7.5, 7.7**

- [x] 6. Checkpoint — Verify score engine
  - Ensure all property and unit tests pass. Verify boundary at exactly 0.5 semitones. Ask the user if questions arise.

- [x] 7. Implement `src/ui/canvasRenderer.js`
  - [x] 7.1 Implement `initRenderer(canvas, config)` and `resizeCanvas(state)`
    - Store canvas reference, get 2D context
    - Apply defaults for `midiMin=48`, `midiMax=84`, `scrollSpeedPxPerMs=0.15`, `lookaheadMs=3000`, `barHeight=12`, and color palette
    - `resizeCanvas`: set `canvas.width = canvas.clientWidth * devicePixelRatio`, `canvas.height = canvas.clientHeight * devicePixelRatio`, scale context by DPR
    - _Requirements: 9.7_

  - [x] 7.2 Implement `midiToY(midi, canvasHeight, midiMin, midiMax)` pure coordinate helper and `renderFrame()`
    - `midiToY`: `canvasHeight - ((midi - midiMin) / (midiMax - midiMin)) * canvasHeight`
    - `renderFrame`: clear canvas, draw pitch grid lines, draw note bars with correct x/width from timing, draw live pitch dot, draw hit glow when `evalResult.isHit`, draw score overlay top-right
    - Note bar x: `xAnchor + (note.start - currentTimeMs) * scrollSpeedPxPerMs` (xAnchor at 40% canvas width)
    - Note bar width: `(note.end - note.start) * scrollSpeedPxPerMs`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.8, 10.1_

  - [x]* 7.3 Write property test for MIDI-to-Y coordinate mapping (Property 10)
    - **Property 10: MIDI-to-Y Coordinate Linearity** — for any m1 < m2 both in [midiMin, midiMax], midiToY(m1) > midiToY(m2) (higher pitch = lower Y value = higher on screen)
    - Verify mapping is strictly monotonically decreasing in Y with respect to increasing MIDI
    - **Validates: Requirements 9.6**

- [x] 8. Implement `src/ui/lyricDisplay.js`
  - [x] 8.1 Implement `initLyricDisplay(container, lyrics)`, `updateLyrics(state, currentTimeMs)`, `resetLyrics(state)`
    - `initLyricDisplay`: render each `LyricLine` as a `<p>`, each char in `chars` as `<span data-start data-end>char</span>`
    - `updateLyrics`: for each span, toggle `active` class based on `start <= currentTimeMs < end`; only mutate spans whose state changes
    - `resetLyrics`: remove `active` class from all spans
    - Export all three as named ES module exports
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x]* 8.2 Write property test for lyric character active state (Property 11)
    - **Property 11: Lyric Character Active State Correctness** — for any LyricChar and any currentTimeMs, the span has class `active` iff `start <= currentTimeMs < end`
    - Use fast-check to generate arbitrary LyricChar timings and sample time values
    - **Validates: Requirements 11.2, 11.3**

- [x] 9. Create `index.html` and `style.css`
  - [x] 9.1 Create `index.html` with all required UI elements
    - `<script type="module" src="./src/main.js">` — no bundler
    - START/STOP button (`id="start-stop-btn"`)
    - Canvas element (`id="pitch-canvas"`)
    - Debug panel showing note name, Hz, score, and hit status
    - Lyric container (`id="lyric-container"`)
    - Canvas fallback text inside `<canvas>` tags for unsupported browsers
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 15.1, 15.2_

  - [x] 9.2 Create `style.css` with dark KTV aesthetic
    - Dark background (`#111` or similar), high-contrast accent colors
    - Canvas styled to fill main content area
    - Debug panel styled clearly readable (monospace font)
    - START button large and prominent; transitions between START/STOP labels
    - Lyric span `.active` class: bright accent color (e.g. `#f0c040`)
    - _Requirements: 2.6, 11.1_

- [x] 10. Implement `src/main.js` — state machine and rAF loop
  - [x] 10.1 Implement the state machine (`idle` → `loading` → `running` → `stopped`, `error` state)
    - Initialize in `idle` state on `DOMContentLoaded`
    - On START click: transition to `loading`, fetch `notes.json` and `lyrics.json` in parallel via `Promise.all`, call `initAudio()`
    - On success: transition to `running`, record `startTime = performance.now()`, call `requestAnimationFrame`
    - On failure (mic denied or fetch error): transition to `error`, display error message, allow dismiss back to `idle`
    - On STOP click: cancel rAF, call `stopAudio()`, transition to `stopped`, show final score
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 3.6, 3.7_

  - [x] 10.2 Implement the `onAnimationFrame(timestamp)` rAF loop and wire all modules together
    - Compute `currentTimeMs = timestamp - startTime`
    - Call in order: `getFilteredBuffer()` → `detectPitch()` → `evaluate()` → `getVisibleNotes()` → `renderFrame()` → `updateLyrics()`
    - Update debug panel DOM elements with latest note, Hz, score, hit status
    - Call `onSyncTick(evalResult)` stub (no-op, with TODO comment for Phase 2 ESP32 WebSocket)
    - Register next frame with `requestAnimationFrame`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3_

  - [x] 10.3 Implement `resizeCanvas` on window resize
    - Attach `window.addEventListener('resize', ...)` to call `resizeCanvas(rendererState)`
    - _Requirements: 9.7_

- [x] 11. Final checkpoint — Integration verification
  - Ensure all tests pass (run test HTML file in browser)
  - Open `index.html` directly (or via `python -m http.server`) — no build step should be needed
  - Verify: START button requests mic, pitch bars scroll, debug panel updates, score accumulates on hit
  - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use fast-check loaded via CDN in a separate `test.html` — no npm required
- All modules use `export`/`import` ES module syntax; no CommonJS, no bundler
- The `onSyncTick` function in `main.js` must remain a clearly-commented no-op stub
- Canvas DPR scaling in `resizeCanvas` ensures crisp rendering on retina/HiDPI displays
- Buffer reuse in `audioContext.js` is critical to avoid GC jitter at 60 FPS

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["2.5", "5.2", "5.3", "7.1", "8.1", "9.1", "9.2"] },
    { "id": 6, "tasks": ["5.4", "7.2", "8.2"] },
    { "id": 7, "tasks": ["7.3", "10.1"] },
    { "id": 8, "tasks": ["10.2"] },
    { "id": 9, "tasks": ["10.3"] }
  ]
}
```
