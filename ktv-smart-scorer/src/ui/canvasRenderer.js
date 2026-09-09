/**
 * canvasRenderer.js
 * Renders the 60 FPS scrolling pitch visualization on an HTML5 Canvas element.
 * Draws target note bars scrolling right-to-left, the user's live pitch dot,
 * and a glowing "hit" effect.
 *
 * Exports: initRenderer, renderFrame, resizeCanvas
 */

// Default configuration values
const DEFAULTS = {
  midiMin: 48,                  // C3
  midiMax: 84,                  // C6
  scrollSpeedPxPerMs: 0.15,
  lookaheadMs: 3000,
  barHeight: 12,
  colors: {
    background:   '#111',
    targetBar:    '#2a5298',
    targetBarHit: '#4fc3f7',
    pitchDot:     '#f0c040',
    hitGlow:      'rgba(79,195,247,0.5)',
    gridLine:     'rgba(255,255,255,0.05)',
  },
};

/**
 * Pure helper — converts a MIDI note number to a canvas Y coordinate.
 * Higher MIDI values map to lower Y (higher on screen).
 *
 * Formula: height - ((midi - midiMin) / (midiMax - midiMin)) * height
 *
 * @param {number} midi      - MIDI note number to convert
 * @param {number} height    - logical canvas height in CSS pixels
 * @param {number} midiMin   - lowest MIDI note in the visible range
 * @param {number} midiMax   - highest MIDI note in the visible range
 * @returns {number} Y coordinate in CSS pixels
 *
 * Requirements: 9.6
 */
function midiToY(midi, height, midiMin, midiMax) {
  return height - ((midi - midiMin) / (midiMax - midiMin)) * height;
}

/**
 * Initialises the renderer with a canvas element and optional display config.
 * Applies defaults for any omitted config fields, gets the 2D context,
 * and immediately calls resizeCanvas to set up DPR-aware dimensions.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Partial<RendererConfig>} [config={}]
 * @returns {RendererState}
 *
 * Requirements: 9.7
 */
function initRenderer(canvas, config = {}) {
  const ctx = canvas.getContext('2d');

  // Deep-merge colors so callers can override individual color keys
  const colors = Object.assign({}, DEFAULTS.colors, config.colors ?? {});

  /** @type {RendererState} */
  const state = {
    canvas,
    ctx,
    midiMin:             config.midiMin             ?? DEFAULTS.midiMin,
    midiMax:             config.midiMax             ?? DEFAULTS.midiMax,
    scrollSpeedPxPerMs:  config.scrollSpeedPxPerMs  ?? DEFAULTS.scrollSpeedPxPerMs,
    lookaheadMs:         config.lookaheadMs         ?? DEFAULTS.lookaheadMs,
    barHeight:           config.barHeight           ?? DEFAULTS.barHeight,
    colors,
    // Logical dimensions — populated by resizeCanvas
    width:  0,
    height: 0,
  };

  resizeCanvas(state);

  return state;
}

/**
 * Resizes the canvas backing store to match the element's current CSS size,
 * accounting for the device pixel ratio so the canvas is sharp on HiDPI screens.
 * Stores the logical (CSS-pixel) width and height on the state for use in rendering.
 *
 * Should be called on window 'resize' events as well as during initRenderer.
 *
 * @param {RendererState} state
 * @returns {void}
 *
 * Requirements: 9.7
 */
function resizeCanvas(state) {
  const { canvas, ctx } = state;
  const dpr = window.devicePixelRatio || 1;

  // Set the physical pixel dimensions of the backing store
  canvas.width  = canvas.clientWidth  * dpr;
  canvas.height = canvas.clientHeight * dpr;

  // Scale all subsequent draw calls so we can work in CSS-pixel coordinates
  ctx.scale(dpr, dpr);

  // Store logical dimensions for use in renderFrame
  state.width  = canvas.clientWidth;
  state.height = canvas.clientHeight;
}

/**
 * Renders a single frame of the karaoke pitch visualization.
 *
 * Drawing order:
 *   1. Clear canvas with background color
 *   2. Horizontal grid lines at each MIDI note row
 *   3. Target note bars (scrolling right-to-left), with hit glow when applicable
 *   4. Live pitch dot at the anchor position (if pitch is detected)
 *   5. Score overlay (top-right corner)
 *
 * @param {RendererState}       state          - renderer state from initRenderer
 * @param {number}              currentTimeMs  - current playback time in ms
 * @param {NoteEntry[]}         visibleNotes   - from scoreEngine.getVisibleNotes()
 * @param {PitchResult | null}  pitchResult    - current detected pitch, or null
 * @param {EvaluationResult}    evalResult     - current scoring result
 * @returns {void}
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.8, 10.1
 */
function renderFrame(state, currentTimeMs, visibleNotes, pitchResult, evalResult) {
  const { ctx, width, height, midiMin, midiMax,
          scrollSpeedPxPerMs, barHeight, colors } = state;

  // The pitch-dot / hit-marker anchor is 40 % from the left edge
  const xAnchor = width * 0.4;

  // ── 1. Clear canvas ────────────────────────────────────────────────────────
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  // ── 2. Horizontal grid lines (one per MIDI semitone row) ──────────────────
  ctx.strokeStyle = colors.gridLine;
  ctx.lineWidth   = 1;

  for (let midi = midiMin; midi <= midiMax; midi++) {
    const y = midiToY(midi, height, midiMin, midiMax);
    ctx.beginPath();
    ctx.moveTo(0,     y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // ── 3. Target note bars ───────────────────────────────────────────────────
  for (const note of visibleNotes) {
    const barX     = xAnchor + (note.start - currentTimeMs) * scrollSpeedPxPerMs;
    const barW     = (note.end - note.start) * scrollSpeedPxPerMs;
    const barY     = midiToY(note.pitch, height, midiMin, midiMax) - barHeight / 2;
    const isTarget = evalResult.isHit && evalResult.targetNote === note;

    if (isTarget) {
      // Hit state: glowing highlighted bar
      ctx.shadowColor = colors.hitGlow;
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = colors.targetBarHit;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = colors.targetBar;
    }

    ctx.fillRect(barX, barY, barW, barHeight);
  }

  // Reset shadow so it doesn't bleed into subsequent draws
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;

  // ── 4. Live pitch dot ─────────────────────────────────────────────────────
  if (pitchResult !== null) {
    const dotY   = midiToY(pitchResult.midiExact, height, midiMin, midiMax);
    const radius = 6;

    ctx.beginPath();
    ctx.arc(xAnchor, dotY, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.pitchDot;
    ctx.fill();
  }

  // ── 5. Score overlay (top-right) ──────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 18px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('SCORE: ' + evalResult.score, width - 12, 28);

  // Reset text alignment to default
  ctx.textAlign = 'left';
}

export { initRenderer, renderFrame, resizeCanvas };
