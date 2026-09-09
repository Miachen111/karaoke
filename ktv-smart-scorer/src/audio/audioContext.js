/**
 * audioContext.js
 * Manages the Web Audio API pipeline: mic acquisition, bandpass filtering,
 * RMS-based noise gating, and feeding time-domain samples to the pitch detector.
 *
 * Exports: initAudio, getFilteredBuffer, stopAudio
 *
 * AudioPipelineResult shape:
 * {
 *   audioContext: AudioContext,
 *   analyserNode: AnalyserNode,
 *   sourceNode:   MediaStreamAudioSourceNode,
 *   stream:       MediaStream,
 *   buffer:       Float32Array   // reusable time-domain buffer, length = fftSize
 * }
 */

/**
 * Initialises the Web Audio pipeline.
 *
 * Steps:
 *  1. Request microphone access via getUserMedia.
 *  2. Create AudioContext.
 *  3. Create BiquadFilterNode (bandpass, 440 Hz centre, Q 3.5 → ~80–1200 Hz pass band).
 *  4. Create AnalyserNode (fftSize 2048).
 *  5. Wire: MediaStreamSource → BiquadFilterNode → AnalyserNode.
 *  6. Allocate a reusable Float32Array buffer of length fftSize.
 *
 * Must be called from within a user-gesture event handler (e.g. button click)
 * to satisfy browser autoplay policies (Requirement 3.7).
 *
 * @returns {Promise<AudioPipelineResult>}
 */
export async function initAudio() {
  // Step 1: Request microphone permission (Requirement 3.1)
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Step 2: Create the AudioContext (Requirement 3.2)
  const audioContext = new AudioContext();

  // Step 3: Create and configure the BiquadFilterNode (Requirement 3.3)
  // type = 'bandpass', frequency = 440 Hz centre, Q = 3.5
  // This yields an effective pass band of approximately 80 Hz – 1200 Hz.
  const filterNode = audioContext.createBiquadFilter();
  filterNode.type = 'bandpass';
  filterNode.frequency.value = 440;
  filterNode.Q.value = 3.5;

  // Step 4: Create the AnalyserNode with fftSize 2048 (Requirement 3.4)
  const analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 2048;

  // Step 5: Wire the audio graph: source → filter → analyser (Requirement 3.2)
  const sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(filterNode);
  filterNode.connect(analyserNode);

  // Step 6: Allocate the reusable time-domain buffer (Requirement 4.5)
  const buffer = new Float32Array(analyserNode.fftSize);

  return { audioContext, analyserNode, sourceNode, stream, buffer };
}

/**
 * Reads the latest time-domain samples from the AnalyserNode into the
 * reusable buffer, then applies an RMS-based noise gate.
 *
 * If the computed RMS is below rmsThreshold the signal is treated as silence
 * and null is returned, preventing false pitch detections in quiet frames
 * (Requirements 4.1 – 4.5).
 *
 * @param {AnalyserNode} analyserNode
 * @param {Float32Array} buffer        - reusable buffer, length must equal fftSize
 * @param {number}       rmsThreshold  - 0.0–1.0, default 0.01
 * @returns {Float32Array | null}
 */
export function getFilteredBuffer(analyserNode, buffer, rmsThreshold = 0.01) {
  // Populate the reusable buffer with the latest time-domain PCM samples
  analyserNode.getFloatTimeDomainData(buffer);

  // Compute RMS using a manual loop to avoid Float32Array .reduce() issues
  // RMS = sqrt( (1/N) * sum( x[i]^2 ) )   (Requirement 4.2)
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSq += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSq / buffer.length);

  // Apply noise gate: return null if signal is too quiet (Requirement 4.3)
  // Return the populated buffer if signal meets the threshold (Requirement 4.4)
  return rms >= rmsThreshold ? buffer : null;
}

/**
 * Tears down the audio pipeline cleanly.
 *
 * Stops all microphone tracks (releases the hardware device) and closes
 * the AudioContext, releasing all associated Web Audio nodes (Requirement 3.5).
 *
 * @param {AudioPipelineResult} pipeline
 * @returns {void}
 */
export function stopAudio(pipeline) {
  // Stop every track on the MediaStream to release the microphone
  pipeline.stream.getTracks().forEach(track => track.stop());

  // Close the AudioContext — this also destroys all connected nodes
  pipeline.audioContext.close();
}
