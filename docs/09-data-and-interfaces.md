# 09 — Data and Interfaces

Conceptual contracts，**尚未加入 runtime**。沿用目前 JavaScript + JSDoc，不要求 TypeScript migration。欄位名稱與 schema 在實作 spike 可修訂，但時間單位、可替換來源、normalized provider 與品質資訊是必要概念。

## Time Standard

統一用非負 **session-relative milliseconds**，欄位以 `Ms` 結尾；時間區間採 [startMs, endMs)。session 起點為來源成功開始本次取樣的時刻；辨識／ready 不重置 clock。時間單調，重啟 session 建立新起點。

AudioFrame.timestampMs 表示 frame 第一個 sample 的 session 時間；durationMs = samples.length / sampleRateHz * 1000（mono）。PitchFrame.timestampMs 對應所分析 window 起點，windowDurationMs 明示窗口長度；不是 UI render 時間。實際 capture clock 如何映射 AudioContext.currentTime 到 session epoch 為 TBD-002，禁止直接混用數值。

performance.now() / rAF 的原始 timestamp 要減 session epoch；AudioContext 的 seconds 要轉 ms 並映射 origin；Date.now() 不可拿來算評分。資料亂序/缺 frame 的容忍策略待核定。重複 frame 不應重複積分。

歌曲 offset 使用独立 `songPositionMs` 與 `anchorSessionMs`：只在有可靠 provider offset 時，songPosition(t) = songPositionMs + (t - anchorSessionMs)。不改 session clock，不以辨識回應到達時刻冒充 sample 的 song offset。offset 缺漏用 null，不能用 0 冒充已同步。

## AudioSource and SongRecognitionProvider

```js
/**
 * @typedef {Object} AudioSource
 * @property {() => Promise<void>} start
 * @property {() => (Promise<void>|void)} stop
 * @property {() => (MediaStream|null)} getStream
 */
/**
 * @typedef {Object} SongRecognitionProvider
 * @property {(input: RecognitionInput) => Promise<RecognitionResult>} recognize
 */
```

MicrophoneAudioSource / FileAudioSource / LineInAudioSource / MockAudioSource，以及未來 USB、mixer、WebSocket 是 adapter 方向。getStream() 的 null 不代表所有 source 均失敗：非 MediaStream 來源需要 frame reader / subscription bridge，確切 pull/push API 是 TBD-002，不能因此刪除 AudioSource abstraction。Audio Pipeline 統一產生 AudioFrame；core analyzers 不取 navigator 或 DOM。

start/stop 的重複呼叫與中途失敗須有測試；停止要取消 frame delivery。recognize 的 timeout/cancel 由 controller/adapter 邊界管理，vendor 例外轉 normalized failure；session ID 防止晚到結果。是否用 AbortSignal 為 proposed contract，具體 provider 支援另驗證。

## Conceptual Models

```js
/**
 * @typedef {Object} AudioFrame
 * @property {string} sessionId
 * @property {number} timestampMs
 * @property {number} durationMs
 * @property {number} sampleRateHz
 * @property {Float32Array} samples Mono normalized PCM, ephemeral
 */
/**
 * @typedef {Object} PitchFrame
 * @property {string} sessionId
 * @property {number} timestampMs
 * @property {number} windowDurationMs
 * @property {number|null} frequencyHz
 * @property {number|null} midi Continuous MIDI, not rounded
 * @property {number|null} cents Deviation from nearest MIDI semitone, not song accuracy
 * @property {number} confidence [0,1], algorithm-specific quality, not probability
 * @property {'valid'|'silence'|'low-confidence'|'invalid'} status
 */
/**
 * @typedef {Object} RhythmEvent
 * @property {string} sessionId
 * @property {number} timestampMs
 * @property {'onset'|'beat-candidate'} type
 * @property {number} confidence [0,1]
 */
/**
 * @typedef {Object} PerformanceFeatures
 * @property {string} sessionId
 * @property {number} startMs
 * @property {number} endMs
 * @property {number} validPitchDurationMs
 * @property {number} pitchCoverageRatio [0,1], valid duration / window duration
 * @property {number|null} pitchStabilityCents Proposed dispersion; statistic TBD
 * @property {Array<{startMs:number,endMs:number,stabilityCents:number|null}>} longNotes
 * @property {{minMidi:number,maxMidi:number}|null} vocalRange
 * @property {Array<{timestampMs:number,midi:number}>} pitchTrend
 * @property {RhythmEvent[]} rhythmEvents
 * @property {Array<{startMs:number,endMs:number,rateHz:number,extentCents:number}>} vibratoCandidates Experimental
 * @property {'usable'|'insufficient-data'} quality
 */
/**
 * @typedef {Object} RecognitionInput
 * @property {string} sessionId
 * @property {string} requestId
 * @property {number} sampleStartMs
 * @property {number} sampleDurationMs
 * @property {{kind:'pcm',samples:Float32Array,sampleRateHz:number}|{kind:'fingerprint',value:string,format:string}} payload
 * @property {AbortSignal} [signal]
 */
/**
 * @typedef {Object} RecognitionResult
 * @property {string} sessionId
 * @property {string} requestId
 * @property {string} providerId
 * @property {'match'|'no-match'|'timeout'|'unavailable'|'insufficient-audio'|'error'|'cancelled'} status
 * @property {{providerTrackId:string|null,title:string|null,artist:string|null}|null} song
 * @property {number|null} confidence Normalized [0,1] only when defined; otherwise null
 * @property {{anchorSessionMs:number,songPositionMs:number}|null} offset
 * @property {string|null} errorCode Sanitized, no secrets/vendor payload/raw audio
 */
/**
 * @typedef {Object} ScoreBreakdown
 * @property {string} specVersion
 * @property {'experimental'|'validated'} maturity Validated requires evidence
 * @property {'scored'|'insufficient-data'} status
 * @property {number|null} total Scale/formula TBD, null if unavailable
 * @property {Array<{metricId:string,value:number|null,unit:string,status:string,experimental:boolean}>} metrics
 * @property {number|null} gameBonus Unit/rule TBD, not silently zero for unknown
 */
/**
 * @typedef {Object} GameEvent
 * @property {string} eventId Unique within session, for deduplication
 * @property {string} sessionId
 * @property {number} timestampMs
 * @property {'long-note'|'combo'|'high-note'|'quality-hint'} type Proposed vocabulary
 * @property {string} ruleVersion
 * @property {boolean} experimental
 */
/**
 * @typedef {Object} SessionState
 * @property {string} sessionId
 * @property {'idle'|'permission'|'listening'|'ready'|'singing'|'finishing'|'completed'|'error'} phase Proposed
 * @property {'pending'|'known'|'unknown'} songMode
 * @property {string} sourceId
 * @property {string|null} providerId
 * @property {number} elapsedMs
 * @property {RecognitionResult|null} recognition
 */
/**
 * @typedef {Object} SessionResult
 * @property {string} sessionId
 * @property {number} startedAtMs Always 0 within this session
 * @property {number} endedAtMs
 * @property {number} validPitchDurationMs
 * @property {'known'|'unknown'} songMode
 * @property {RecognitionResult|null} recognition Metadata only, no raw payload
 * @property {ScoreBreakdown} score
 * @property {PerformanceFeatures} features Summary; retained detail policy TBD
 */
```

## Validation / Retention / Compatibility

所有數值須 finite；duration 非負，window end >= start；confidence 不可由缺值補成 1。null 表示未知／無法量測，空陣列表示没有觀察到事件，兩者不等同「唱得差」。零長度 window 不計 coverage。thresholds 與 rule versions 尚待 scoring spec。

PCM buffer 可能被現有 pipeline 重用，跨 async 邊界須有明確 ownership/copy policy；buffer 上限、取樣長度與 concurrency TBD，不允許無界累積整場原始音訊。SessionResult 不含 PCM；session detail/結果持久化尚未決策。

現有 `hz`→frequencyHz、`midiExact`→midi、rounded `midi`→顯示用整數，是未來 mapping；目前不改現有 export。現有 notes.start/end 的 ms 僅代表 demo timeline，不是正式 reference，也不是本版 AudioFrame。

## M0 Evidence Addendum — Proposed, not a schema migration

[M0 report sections 7–8](evidence/m0-audio-evidence.md) 已確認現有PCM沒有capture timestamp、buffer會重用、correlation不在public output。最小提案是保留AudioSource生命週期，另有source-specific `FrameReader.readFrame(): AudioFrame | null`，核心 `PitchAnalyzer.analyze(frame)` 不取navigator/DOM。

建議frame增加 `sequence`（identity，不是sample index）及 `timestampBasis: 'analyser-estimate' | 'sample-index'`；同步borrowed buffer僅有效到下次read，跨async需要bounded copy/ownership。Analyser模式的 `(currentTime-audioEpoch)*1000-durationMs` 只能是窗口起點估計，不能宣稱microphone硬體sample時間；起始不足完整窗不應clamp負時間冒充完整資料。Browser精度與gap/resume仍TBD-002。

正式PitchFrame仍是目標contract：M0證明薄wrapper無法憑空回傳confidence及null reason，且高correlation也可能錯octave。不得填成1/0冒充品質；M1不宣稱完成FR-004，M2再決定diagnostic output與low-level/unavailable status。這次沒有把confidence改成任意值，也沒有核定新的threshold。
