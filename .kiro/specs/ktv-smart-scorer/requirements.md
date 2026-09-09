# Requirements Document

## Introduction

The Real-Time Karaoke Scoring & Multimedia Web Engine (ktv-smart-scorer) is a serverless, browser-edge-based proof-of-concept application that captures a user's live singing via microphone, processes audio in real time using the Web Audio API, extracts the fundamental pitch frequency, and compares it against a pre-loaded MIDI note timeline to compute a karaoke-style score. The system renders a 60 FPS scrolling pitch visualization on an HTML5 Canvas and synchronizes per-character lyric highlighting. The entire application runs as native ES modules in the browser with no build tools and no external library dependencies.

---

## Glossary

- **AudioContext**: The Web Audio API's central processing object that manages and routes audio nodes.
- **AnalyserNode**: A Web Audio API node that provides real-time frequency and time-domain analysis.
- **BiquadFilterNode**: A Web Audio API node that applies a configurable filter (bandpass, lowpass, etc.) to an audio stream.
- **f0**: The fundamental frequency — the lowest sinusoidal component of a periodic waveform; perceived as musical pitch.
- **MIDI Note Number**: An integer (0–127) representing a musical note in the MIDI standard; middle C (C4) = 60.
- **midiExact**: A continuous (non-integer) MIDI note value derived from a frequency, used for sub-semitone accuracy.
- **Semitone**: The smallest standard musical interval; adjacent MIDI note numbers differ by exactly 1 semitone.
- **RMS (Root Mean Square)**: A measure of signal amplitude; used as the noise gate metric.
- **YIN/Autocorrelation**: A pitch detection algorithm based on computing the autocorrelation of an audio buffer across candidate lag values.
- **Parabolic Interpolation**: A technique to refine a discrete peak location to sub-sample accuracy.
- **NoteEntry**: A JSON data record with `start` (ms), `end` (ms), `pitch` (MIDI), and `note` (name) fields.
- **LyricChar**: A JSON data record with `char`, `start` (ms), and `end` (ms) fields representing one karaoke character.
- **Hit**: A scoring event that occurs when the user's detected pitch is within ±0.5 semitones of the active target note.
- **rAF Loop**: The `requestAnimationFrame` render loop, running at approximately 60 FPS.
- **AudioPipeline**: The assembled chain of Web Audio nodes (source → filter → analyser) returned by `initAudio()`.
- **ScoreEngine**: The `scoreEngine.js` module responsible for note timeline management and hit evaluation.
- **CanvasRenderer**: The `canvasRenderer.js` module responsible for all 60 FPS Canvas drawing operations.
- **LyricDisplay**: The `lyricDisplay.js` module responsible for per-character subtitle highlighting.
- **PitchDetector**: The `pitchDetector.js` module implementing the autocorrelation pitch extraction algorithm.
- **Main Controller**: The `main.js` module acting as the application state machine and rAF loop orchestrator.
- **State Machine**: The `main.js` finite-state machine with states: `idle`, `loading`, `running`, `stopped`, `error`.
- **ESP32 Sync Hook**: A reserved, no-op function stub in `main.js` intended for future WebSocket-based IoT display sync.
- **DPR**: Device Pixel Ratio — used for retina/HiDPI canvas scaling.

---

## Requirements

### Requirement 1: Static Asset Data

**User Story:** As a developer testing the system, I want pre-loaded MIDI note and lyric JSON data files, so that the scoring and lyric systems have standard test content to work with.

#### Acceptance Criteria

1. THE System SHALL provide a `assets/song_001/notes.json` file containing an array of `NoteEntry` objects representing a C3–G3 ascending scale test sequence.
2. WHEN the `notes.json` file is parsed, THE System SHALL ensure every `NoteEntry` has a `start` value greater than or equal to zero, an `end` value strictly greater than `start`, a `pitch` value that is an integer in the range [0, 127], and a `note` string matching the human-readable name for that MIDI pitch.
3. THE System SHALL provide a `assets/song_001/lyrics.json` file containing an array of `LyricLine` objects where each line has a `lineId`, a `text` string, and a `chars` array of `LyricChar` objects.
4. WHEN the `lyrics.json` file is parsed, THE System SHALL ensure every `LyricChar` has a `char` string, a `start` value greater than or equal to zero, and an `end` value strictly greater than `start`.
5. THE System SHALL ensure no two `NoteEntry` objects in `notes.json` have overlapping time windows (i.e., for any two entries i and j where i.start < j.start, i.end must be less than or equal to j.start).

---

### Requirement 2: User Interface — HTML and CSS

**User Story:** As a user, I want a modern dark-themed karaoke interface with clear controls and feedback areas, so that I can start singing, see my pitch, and track my score.

#### Acceptance Criteria

1. THE System SHALL provide an `index.html` file that loads all JavaScript modules using `<script type="module">` with no bundler or build step required.
2. THE System SHALL render a START/STOP toggle button that is prominently visible and accessible, with a label indicating the current state (e.g., "START" when idle, "STOP" when running).
3. THE System SHALL render an HTML5 Canvas element with id `pitch-canvas` for pitch visualization.
4. THE System SHALL render a debug panel that displays: the currently detected note name (or "—" when silent), the currently detected Hz value (or "—" when silent), the current accumulated score, and the current hit status ("HIT" or "MISS").
5. THE System SHALL render a lyric container element with id `lyric-container` for per-character subtitle display.
6. THE System SHALL apply a dark modern KTV visual aesthetic via `style.css`, including a dark background, high-contrast accent colors, and clear typographic hierarchy.
7. WHERE the application is running in a browser that does not support the HTML5 Canvas element, THE System SHALL display a text fallback message within the canvas element's inner content.

---

### Requirement 3: Audio Pipeline Initialization and Teardown

**User Story:** As a user, I want the application to request microphone access when I click START and release it when I click STOP, so that my privacy is respected and audio resources are properly managed.

#### Acceptance Criteria

1. WHEN the user activates the START button, THE AudioPipeline SHALL request microphone access via `navigator.mediaDevices.getUserMedia({ audio: true })`.
2. WHEN microphone access is granted, THE AudioPipeline SHALL create an `AudioContext`, a `BiquadFilterNode` configured as a bandpass filter, and an `AnalyserNode`, and connect them in the chain: `MediaStreamSource → BiquadFilterNode → AnalyserNode`.
3. THE AudioPipeline SHALL configure the `BiquadFilterNode` with `type = 'bandpass'` and parameters that produce an effective pass band covering approximately 80 Hz to 1200 Hz.
4. THE AudioPipeline SHALL set `AnalyserNode.fftSize` to 2048 to provide a time-domain buffer of 2048 samples.
5. WHEN the user activates the STOP button, THE AudioPipeline SHALL stop all microphone tracks, close the `AudioContext`, and release all Web Audio nodes.
6. IF microphone access is denied by the user, THEN THE State Machine SHALL transition to the `error` state and THE System SHALL display a message informing the user that microphone permission is required.
7. THE AudioPipeline SHALL only create the `AudioContext` inside a user gesture event handler to comply with browser autoplay policies.

---

### Requirement 4: RMS-Based Noise Gate

**User Story:** As a user in a noisy environment, I want the system to ignore low-level background noise so that ambient sounds don't trigger false pitch detections or incorrect scoring.

#### Acceptance Criteria

1. WHEN `getFilteredBuffer()` is called, THE AudioPipeline SHALL read the latest time-domain samples from the `AnalyserNode` into a reusable `Float32Array` buffer.
2. THE AudioPipeline SHALL compute the RMS value of the buffer as `sqrt(sum(buffer[i]^2) / N)` where N is the buffer length.
3. IF the computed RMS is below the configured `rmsThreshold` (default 0.01), THEN THE AudioPipeline SHALL return `null` from `getFilteredBuffer()`, indicating that the signal should be treated as silence.
4. IF the computed RMS is greater than or equal to `rmsThreshold`, THEN THE AudioPipeline SHALL return the populated buffer for pitch detection.
5. THE AudioPipeline SHALL reuse the same `Float32Array` buffer allocation across all calls to `getFilteredBuffer()` to avoid per-frame garbage collection.

---

### Requirement 5: Pitch Detection

**User Story:** As a user, I want the system to accurately detect the pitch of my voice in real time, so that I can receive immediate feedback on whether I'm singing the right note.

#### Acceptance Criteria

1. WHEN a non-null buffer is provided to `detectPitch()`, THE PitchDetector SHALL compute the autocorrelation of the buffer for all lag values `τ` in the range `[sampleRate / maxHz, sampleRate / minHz]`.
2. THE PitchDetector SHALL normalise each autocorrelation value by the zero-lag autocorrelation `r[0]` to produce a clarity score in the range [0, 1].
3. IF the maximum normalised correlation is below the `clarityThreshold` (default 0.9), THEN THE PitchDetector SHALL return `null` indicating no confident pitch was detected.
4. WHEN a confident pitch is detected, THE PitchDetector SHALL apply parabolic interpolation around the best lag value to compute a sub-sample-accurate fundamental frequency.
5. WHEN a confident pitch is detected, THE PitchDetector SHALL return a `PitchResult` object containing: `hz` (the detected frequency), `midi` (the nearest integer MIDI note), `midiExact` (the continuous MIDI value for sub-semitone precision), and `noteName` (the human-readable note name).
6. THE PitchDetector SHALL only return pitch results where `hz` is within `[minHz, maxHz]` (default 80–1200 Hz).
7. THE PitchDetector SHALL NOT mutate the input buffer.
8. THE PitchDetector SHALL export `detectPitch`, `hzToMidi`, and `midiToNoteName` as named ES module exports.

---

### Requirement 6: Hz and MIDI Conversion

**User Story:** As a developer, I want reliable Hz-to-MIDI and MIDI-to-note-name conversion utilities, so that pitch values can be consistently displayed and compared throughout the system.

#### Acceptance Criteria

1. WHEN `hzToMidi(hz)` is called, THE PitchDetector SHALL return the nearest integer MIDI note number using the formula `round(69 + 12 * log2(hz / 440))`.
2. WHEN `midiToNoteName(midi)` is called with an integer in [0, 127], THE PitchDetector SHALL return a string of the form `<NoteLetter>[#]<Octave>` where the note letter is one of A–G and the octave is the correct scientific pitch notation octave number.
3. THE PitchDetector SHALL use the note name sequence `["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]` for the 12 pitch classes.

---

### Requirement 7: Score Engine — Note Loading and Evaluation

**User Story:** As a user singing along, I want the system to compare my pitch against the current target note and tell me in real time whether I'm hitting it, so I can adjust and improve my score.

#### Acceptance Criteria

1. WHEN `initScoreEngine(notes)` is called, THE ScoreEngine SHALL store the provided `NoteEntry` array and initialize `score`, `totalHits`, and `totalEvaluations` to zero.
2. WHEN `evaluate(state, currentTimeMs, detectedMidiExact)` is called, THE ScoreEngine SHALL increment `state.totalEvaluations` by exactly 1.
3. WHEN `evaluate()` is called, THE ScoreEngine SHALL find the `NoteEntry` whose `start <= currentTimeMs < end` as the active target note, or `null` if no note is currently active.
4. WHEN `evaluate()` is called and both a target note and a non-null `detectedMidiExact` are present, IF `|detectedMidiExact - targetNote.pitch| <= 0.5`, THEN THE ScoreEngine SHALL set `isHit = true`, increment `state.score` by 10, and increment `state.totalHits` by 1.
5. WHEN `evaluate()` is called and either the target note is null or `detectedMidiExact` is null, THEN THE ScoreEngine SHALL set `isHit = false` and leave `state.score` and `state.totalHits` unchanged.
6. THE ScoreEngine SHALL return an `EvaluationResult` object containing `isHit`, `isInWindow`, `targetNote`, `detectedMidiExact`, `semitoneError`, and `score` on every call to `evaluate()`.
7. THE ScoreEngine SHALL NOT apply negative scoring (score SHALL never decrease as a result of a miss or no-pitch frame).

---

### Requirement 8: Score Engine — Visible Notes Lookahead

**User Story:** As a user, I want to see upcoming target notes on the canvas before they are due, so that I can prepare to sing them in time.

#### Acceptance Criteria

1. WHEN `getVisibleNotes(state, currentTimeMs, windowMs)` is called, THE ScoreEngine SHALL return all `NoteEntry` objects for which `note.end > currentTimeMs` AND `note.start < currentTimeMs + windowMs`.
2. THE ScoreEngine SHALL return an empty array from `getVisibleNotes()` when no notes fall within the specified time window.

---

### Requirement 9: Canvas Renderer — Pitch Visualization

**User Story:** As a user, I want to see target note bars scrolling from right to left and my live detected pitch as a dot, so that I have a visual guide to sing along with.

#### Acceptance Criteria

1. WHEN `renderFrame()` is called, THE CanvasRenderer SHALL clear the entire canvas with the configured background color before drawing any other elements.
2. WHEN `renderFrame()` is called, THE CanvasRenderer SHALL draw horizontal pitch grid lines across the canvas for each MIDI pitch row within the configured `[midiMin, midiMax]` range.
3. WHEN `renderFrame()` is called with a non-empty `visibleNotes` array, THE CanvasRenderer SHALL draw each note as a filled horizontal rectangle positioned at the correct MIDI-to-Y coordinate, with its horizontal position and width determined by `(note.start - currentTimeMs) * scrollSpeedPxPerMs` and `(note.end - note.start) * scrollSpeedPxPerMs` respectively, offset from a fixed reference point.
4. WHEN `renderFrame()` is called with a non-null `pitchResult`, THE CanvasRenderer SHALL draw a bright dot at the Y coordinate corresponding to `pitchResult.midiExact` at a fixed horizontal position (approximately 40% from the left edge).
5. WHEN `evalResult.isHit` is true and a target note bar is on screen, THE CanvasRenderer SHALL apply a glow or shadow visual effect to the target note bar to provide hit feedback.
6. THE CanvasRenderer SHALL map MIDI note numbers to Y coordinates using the formula: `y = canvasHeight - ((midi - midiMin) / (midiMax - midiMin)) * canvasHeight`.
7. WHEN `resizeCanvas()` is called, THE CanvasRenderer SHALL update the canvas's width and height attributes to match the element's CSS-computed dimensions, accounting for the Device Pixel Ratio (DPR) for HiDPI screens.
8. THE CanvasRenderer SHALL render at a target rate of 60 FPS by being called from the `requestAnimationFrame` callback.

---

### Requirement 10: Canvas Renderer — Score Overlay

**User Story:** As a user, I want to see my current score displayed on the canvas, so that I can track my performance at a glance.

#### Acceptance Criteria

1. WHEN `renderFrame()` is called, THE CanvasRenderer SHALL draw the current accumulated score value as a text overlay in the top-right area of the canvas.

---

### Requirement 11: Lyric Display

**User Story:** As a user, I want to see lyrics on screen with each character lighting up at the correct moment, so that I can follow along with the song.

#### Acceptance Criteria

1. WHEN `initLyricDisplay(container, lyrics)` is called, THE LyricDisplay SHALL render each `LyricLine` as a block element in the container, with each character from `chars` wrapped in an individual `<span>` element.
2. WHEN `updateLyrics(state, currentTimeMs)` is called, THE LyricDisplay SHALL apply an `active` CSS class to every `<span>` whose corresponding `LyricChar.start <= currentTimeMs < LyricChar.end`.
3. WHEN `updateLyrics(state, currentTimeMs)` is called, THE LyricDisplay SHALL remove the `active` CSS class from every `<span>` whose corresponding `LyricChar` time window has ended or not yet started.
4. WHEN `resetLyrics(state)` is called, THE LyricDisplay SHALL remove the `active` class from all character spans.
5. THE LyricDisplay SHALL update only the spans whose active state has changed between frames, rather than re-rendering all spans on every frame.

---

### Requirement 12: Main Controller — State Machine

**User Story:** As a user, I want the application to handle all states (starting, running, stopping, errors) smoothly and predictably, so that I always know what the app is doing.

#### Acceptance Criteria

1. WHEN the page loads, THE State Machine SHALL initialize in the `idle` state with the START button enabled.
2. WHEN the user clicks the START button in the `idle` or `stopped` state, THE State Machine SHALL transition to the `loading` state, disable the START button, and begin asset loading and audio initialization.
3. WHEN all assets are loaded and microphone permission is granted in the `loading` state, THE State Machine SHALL transition to the `running` state and start the `requestAnimationFrame` loop.
4. IF an asset load or microphone initialization fails in the `loading` state, THEN THE State Machine SHALL transition to the `error` state and display an error message.
5. WHEN the user clicks the STOP button in the `running` state, THE State Machine SHALL transition to the `stopped` state, cancel the active `requestAnimationFrame` handle, stop the audio pipeline, and display the final score.
6. WHEN in the `error` state, THE State Machine SHALL allow the user to dismiss the error and return to the `idle` state.

---

### Requirement 13: Main Controller — rAF Loop Orchestration

**User Story:** As a user, I want all audio processing, scoring, and rendering to happen smoothly in sync each frame, so that the pitch visualization and score update without perceptible lag.

#### Acceptance Criteria

1. WHEN the rAF loop is running, THE Main Controller SHALL compute `currentTimeMs` as `timestamp - startTime` using the `DOMHighResTimeStamp` provided by `requestAnimationFrame`.
2. WHEN the rAF loop is running, THE Main Controller SHALL call `getFilteredBuffer()`, `detectPitch()`, `evaluate()`, `getVisibleNotes()`, `renderFrame()`, and `updateLyrics()` in that order on every frame.
3. WHEN the rAF loop is running, THE Main Controller SHALL update the debug panel with the latest `PitchResult` and `EvaluationResult` values on every frame.
4. WHEN the rAF loop is running, THE Main Controller SHALL call the `onSyncTick(evalResult)` stub on every frame as a reserved hook for future ESP32 WebSocket sync.
5. THE Main Controller SHALL use a single `performance.now()`-based clock reference (`startTime`) as the authoritative time source for both the score engine and canvas renderer.

---

### Requirement 14: ESP32 WebSocket Sync Hook — Reserved

**User Story:** As a future developer, I want a clearly defined and documented hook point for WebSocket-based ESP32 display sync, so that Phase 2 integration can be added without modifying the core audio or scoring modules.

#### Acceptance Criteria

1. THE Main Controller SHALL contain a function named `onSyncTick(evalResult)` that accepts an `EvaluationResult` and is called on every rAF frame.
2. WHEN called, THE `onSyncTick` function SHALL be a no-op stub in Phase 1 (no WebSocket connection, no data transmission).
3. THE `onSyncTick` function SHALL include a code comment indicating its purpose: reserved for Phase 2 ESP32 WebSocket sync integration.

---

### Requirement 15: Module Structure and No-Build Constraint

**User Story:** As a developer, I want the project to run directly in a browser without any build tools, so that it is easy to open, inspect, and modify.

#### Acceptance Criteria

1. THE System SHALL use the ES module format (`export`/`import`) for all JavaScript files.
2. THE System SHALL load all modules via `<script type="module">` in `index.html` with no bundler, transpiler, or build step required.
3. THE System SHALL NOT depend on any external JavaScript library for core audio processing, pitch detection, scoring, or rendering.
4. THE System SHALL be structured with source files at the following paths: `src/audio/audioContext.js`, `src/audio/pitchDetector.js`, `src/scoring/scoreEngine.js`, `src/ui/canvasRenderer.js`, `src/ui/lyricDisplay.js`, `src/main.js`.
5. WHERE external libraries are used for testing purposes only, THE System SHALL load them via CDN `<script>` tags in a separate test HTML file and SHALL NOT include them in the main application bundle or `index.html`.
