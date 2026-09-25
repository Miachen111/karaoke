# M0 — Audio Evidence Technical Spike

Date: 2026-09-25  
Status: **Synthetic / calculation evidence complete; browser, microphone and KTV validation not run.**  
Scope: 現有 audio/pitch pipeline 評估、deterministic fixtures、最小 contract 提案。沒有實作 MVP、recognition、AI、stability/long-note/game scoring，也沒有改正式程式或 scoring formula。

## 1. Evidence and Reproduction

- [Research harness](../../ktv-smart-scorer/tests/m0-audio-evidence.mjs)：只用 Node built-ins，直接載入現有 production exports，不新增 package/config。
- [Machine-readable results](m0-audio-results.json)：29 fixtures × 2 sample rates × 2 window sizes × 3 paths × 24 windows = **8,352 observations / 348 rows**。保留逐窗口結果、分母、null、RMS、診斷 correlation、環境與 source/harness SHA-256；不儲存 raw PCM。
- Production baseline: Git `00010855fb43604118d7d30781f1931684eb4c89`；先前 docs 初始化仍在 working tree，並非本次新增的 runtime 改動。
- Environment: Windows `10.0.26200` x64、AMD Ryzen AI 9 HX 370、24 logical CPUs、Node `v24.18.0` / V8 `13.6.233.17-node.50`。這不是 browser benchmark。
- Related requirements: FR-002/003/004/019、NFR-001/003/007/010/012 的證據與設計輸入；**沒有宣稱這些 FR 已實作完成**。

從 repo root 重現：

```powershell
node --check ktv-smart-scorer/tests/m0-audio-evidence.mjs
node ktv-smart-scorer/tests/m0-audio-evidence.mjs --out docs/evidence/m0-audio-results.json
node ktv-smart-scorer/tests/m0-audio-evidence.mjs --verify docs/evidence/m0-audio-results.json
```

`--out` 會更新觀察時間、CPU timing 及 evidence JSON；數學與輸出應可重現。`--verify` 比較全部 fixture outputs、filter、controls、source/harness hashes；刻意不比較不確定的 wall/CPU timing。變更 runtime/harness 後應建立新 baseline，不應把 mismatch 隱藏。Node 版本與浮點平台不同時，exact replay 可能失敗，須保留差異再判斷。

## 2. Current Pipeline Findings

| 階段 | 現有程式行為 | 限制 |
|---|---|---|
| Start | main.js 先 fetch demo notes/lyrics，再 await initAudio，再設 performance.now() 起點 | 起點在取得 stream／接圖之後，不是首個 capture sample |
| Microphone | getUserMedia({audio:true})；無 deviceId/channel/sampleRate/echoCancellation/noiseSuppression/autoGainControl 明確 constraints | 真實 track settings、OS/browser 處理未知；沒有本次收音 |
| Audio context | new AudioContext()，未指定 sample rate；detector 用 context.sampleRate | 不是寫死 44.1k；44.1/48k 是本次測試 inputs，不是量到的麥克風 rate |
| Graph | MediaStreamAudioSource → BiquadFilter → AnalyserNode，無 destination 監聽輸出 | 不做 source separation，不證明是主唱 |
| Filter | bandpass；frequency=440Hz；Q=3.5 | 窄頻，並非註解聲稱的 80–1200Hz 通帶 |
| Window | analyser.fftSize=2048；重用 Float32Array(2048)；getFloatTimeDomainData | 讀的是最近一窗；不是連續、無重疊的 source callback |
| Gate | 濾波後 RMS=sqrt(sum(x²)/N)，>=0.01 才送 detector | 絕對振幅門檻，不是 voice activity detector；被濾弱的音高較易淘汰 |
| Detector | 搜尋 floor(Fs/1200)..floor(Fs/80) lag；sum-of-products autocorrelation / r[0]；全域最大值 >=0.9 才通過 | 非標準 YIN difference/CMND；沒有 mean removal、overlap normalization 或 local-peak requirement |
| Refinement | best lag 周邊三點 parabolic interpolation，Hz=Fs/refinedLag，最後 clamp 80..1200 | 插值方向與三點二次曲線頂點相反；邊界不一定是峰值，可能大幅外插 |
| Output | {hz, midi(rounded), midiExact, noteName} 或 null | 不回傳 confidence、timestamp、null reason 或 source identity |
| Cadence | 每次 requestAnimationFrame 同步 gate→pitch→score→render→lyrics | 「60 FPS」是意圖，不是保證；沒有獨立 audio hop |
| Stop | stop tracks，呼叫 AudioContext.close()；main 取消 rAF | close 未 await；初始化中途失敗的 cleanup 有缺口，尚未注入失敗實測 |

本次未使用麥克風，也沒有改 capture constraints。不能從 `audio:true` 推定 browser 已停用 AGC/降噪或 device 是 mono。

## 3. Tests / Fixtures Used

29 組 fixtures：silence；純音 80Hz、E2 82.407、A2 110、C3 130.813、E3 164.814、A3 220、C4 261.626、E4 329.628、A4 440、C5 523.251、E5 659.255、A5 880、C6 1046.502、1200Hz；A4 peak 0.005/0.014/0.02；110/220/880Hz peak 0.03；A4 peak 0.2 + white noise peak 0.03/0.1/0.3；white noise peak 0.2；220+440 equal / weak-fundamental mixture；DC=0.2；60Hz below-search-range control。這是跨音高取樣，不是宣稱每位使用者都有 E2–C6 音域。

- PRNG: seed `0x4b545630`，LCG、uniform [-1,1)。相同 seed，無 random external data。
- Peak amplitude 不是 RMS；純音除另註外 peak=0.2。沒有 normalization/clipping。
- 每組連續合成 stream 前置 250ms，排除濾波初始 transient；各取 24 windows，hop=round(Fs/60)。有重疊，不是 24 個獨立統計樣本；也不是實測 rAF。
- 2048 是 runtime baseline；4096 只是對照舊測試，不改 production。
- A: raw-detector：直接呼叫正式 detectPitch，gate bypass。此路徑 JSON 的 gatePassed=true 表示 bypass，不是 gate 量測。
- B: raw-gate-detector：用 stub analyser 只複製 PCM，呼叫正式 getFilteredBuffer，再呼叫正式 detectPitch。
- C: calculated-filter-gate-detector：自行實作 W3C bandpass coefficient calculation，連續 filter 後送同一正式 gate/detector。這不是測到的 BiquadFilterNode，也不是完整 microphone integration。
- Diagnostics：只在記憶體中的 source 副本額外 export 既有 private autocorrelation/interpolation，重算 bestCorrelation/bestTau；正式輸出仍来自未改的 public export。不是新增 production confidence API。

Coverage = non-null / 全部 windows；與「正確率」不同。Error cents = 1200×log2(detectedHz/referenceHz)，只對有結果的窗口計算；null 不從 coverage 分母移除。下表 cents 是 signed median，不是絕對誤差上限；每窗與 absolute-error stats 在 JSON。

## 4. Measured Results

### Pure-tone baseline — unfiltered detector, 2048 samples

每格為 detected/24；Hz、rounded MIDI 與 signed cents median。幅度 0.2。

| Input | 44.1kHz: coverage; Hz / MIDI / cents | 48kHz: coverage; Hz / MIDI / cents |
|---|---|---|
| 80Hz | 16/24; 554.984 / 73 / +3353.25 | 8/24; 565.265 / 73 / +3385.03 |
| E2 82.407 | 6/24; 570.130 / 73 / +3348.54 | 7/24; 570.177 / {73,74} / +3348.69 |
| A2 110 | 0/24; null | 0/24; null |
| C3 130.813 | 0/24; null | 0/24; null |
| E3 164.814 | 0/24; null | 0/24; null |
| A3 220 | 24/24; 220.422 / 57 / +3.32 | 0/24; null |
| C4 261.626 | 24/24; 262.723 / 60 / +7.24 | 24/24; 262.284 / 60 / +4.35 |
| E4 329.628 | 24/24; 332.753 / 64 / +16.34 | 24/24; 331.612 / 64 / +10.39 |
| A4 440 | 24/24; 441.404 / 69 / +5.52 | 24/24; 440.116 / 69 / +0.46 |
| C5 523.251 | 24/24; 526.160 / 72 / +9.60 | 24/24; 519.580 / 72 / -12.19 |
| E5 659.255 | 24/24; 656.353 / 76 / -7.64 | 24/24; 654.955 / 76 / -11.33 |
| A5 880 | 24/24; 883.607 / 81 / +7.08 | 24/24; 896.933 / 81 / +33.00 |
| C6 1046.502 | 24/24; 1052.990 / 84 / +10.70 | 24/24; 1039.875 / 84 / -11.00 |
| 1200Hz | 24/24; 1183.394 / 86 / -24.13 | 24/24; 1199.485 / 86 / -0.74 |

不能只看 rounded MIDI；48kHz A5 雖都落 MIDI81，仍有約 ±數十 cents 的 phase-dependent error。這 24-window sampling 不是完整 phase sweep，不能推論全域 worst case。

### Gate / noise / mixture controls — 2048 samples

| Fixture | Raw detector (44.1k / 48k) | Calculated filter + actual gate/detector (44.1k / 48k) | Interpretation |
|---|---|---|---|
| Silence | 0/24, 0/24 | 0/24, 0/24 | 本組無 false detections |
| White noise peak 0.2 | 0/24, 0/24 | 0/24, 0/24 | 本 seed 無 false pitch；filtered gate 各通過 14/24、17/24，但 detector 均拒絕 |
| A4 peak 0.005 / 0.014 | 各 24/24 | 各 0/24 | RMS gate 拒絕，不是算法不能辨識；raw+gate 也拒絕 |
| A4 peak 0.02 | 各 24/24 | 各 24/24 | 濾波中心保留 |
| 220Hz peak 0.03 | 24/24, 0/24 | 0/24, 0/24 | 濾波後 gate 全拒絕；48k 另有 correlation 問題 |
| 880Hz peak 0.03 | 各 24/24 | 各 0/24 | 同幅 440 能過，880 被 filter+gate 淘汰 |
| A4 + noise peak 0.03 | 各 24/24 | 各 24/24 | 僅此組合 |
| A4 + noise peak 0.1 / 0.3 | 各 0/24 | 各 24/24 | 窄頻對中心音有效，不能外推其他音高或 KTV |
| Equal 220+440 | 16/24, 0/24 | 24/24, 0/24 | sample-rate / confidence 敏感 |
| Weak 220 (0.03) + strong 440 (0.2) | 各 24/24，判成約 440 | 各 24/24，仍約 440 | 相對 220 基音約 +1200 cents；有結果但錯 octave |
| DC 0.2 | 各 24/24，1200Hz | 各 0/24 | raw detector 假音高；filter 穩態抑制 DC |
| 60Hz control | 各 24/24，約 543/575Hz | 各 0/24 | 不在 range 不保證回傳 null；filter+gate 掩蓋此例 |

### 4096 comparison

44.1k 的 110Hz 從 0/24→24/24；48k 的 110Hz 仍 0/24。48k 的 220Hz 從 0/24→24/24。80/82.407Hz 仍有嚴重錯判。因此增大 buffer 並不是完整修正，而且窗口時長會翻倍；本次沒有採用此變更。

### CPU / latency observations

記錄檔保留的 run：每組先 warm up 200 次，量 500 次未改的 detectPitch；排除 fixtures、diagnostics、filter、gate、UI 與 capture。

| Fs / input / N | Median call wall ms | p95 ms | 500-call process CPU ms |
|---|---:|---:|---:|
| 44.1k / A4 / 2048 | 0.5470 | 0.5740 | 281 |
| 48k / A4 / 2048 | 0.5857 | 0.5929 | 297 |
| 44.1k / silence / 2048 | 0.0013 | 0.0013 | 0 (timer granularity) |
| 48k / silence / 2048 | 0.0013 | 0.0013 | 0 (timer granularity) |

不是 CPU utilization%、browser/Mobile budget、cold-start 或 end-to-end latency。silence 的 process CPU 0 是量測解析度，不是零運算。Node 的本機結果不能證明 Kiro 註解「所有裝置 <2ms」。

Calculated window duration：2048/44100=46.440ms、2048/48000=42.667ms；4096 分別 92.880/85.333ms。這是 window span，不是 microphone→UI 延遲。假設 60Hz polling，hop 約16.67ms，2048 窗口會重疊約29.77/26.00ms；假設 30/120Hz 時讀取數亦不同。以上只為時間計算，**没有量到 browser render cadence、輸入 latency、GC/jank 或實機 CPU**。

## 5. Failure Cases and Confidence Evidence

**F-001 — Normalization suppresses lower fundamentals.** r[tau] 只累加 N-tau 個項，分母 r[0] 有 N 個；穩態純音一個 period 的相關值粗略隨 1-tau/N 下降（有限窗相位仍影響）。以 0.9 gate 粗估需 f > Fs/(0.1N)，2048 約 215.3/234.4Hz；這是解釋，不是新閾值。A3 220 的 bestCorrelation 在44.1k約0.9011–0.9037、48k約0.8928–0.8944，與通過／拒絕直接吻合。

**F-002 — No local-peak validation.** 80Hz/48k第一窗 bestTau=40（搜尋下界），bestCorrelation=0.90957，refinedTau=84.9159，輸出565.265Hz。相關曲線近零 lag 的肩部被當週期峰值；未限制插值幅度，最後 clamp 只保證 range，不保證真實 f0。

**F-003 — Parabolic interpolation sign.** 設三點 prev/curr/next，二次曲線頂點應是：
`tau + (prev-next) / (2*(prev-2*curr+next))`。
現有分母為 `2*(2*curr-prev-next)`，方向相反。這是由三點二次式直接推導，不是採用新 library。48k A5 第一窗：bestTau55、現有55.456508、二次頂點54.543492，現有輸出865.543Hz / -28.677cents。這不代表只翻符號就能解決 F-001/002/004；非峰值邊界不應做同一插值。**本次只量測，不修正。**

**F-004 — Harmonic ambiguity.** weak-fundamental fixture 的 raw correlation 約0.9003–0.9158（48k），filtered 約0.9436–0.9461，但都高一個 octave。Confidence 不能直接表示「正確機率」或「主唱信心」。

**F-005 — Input quality indistinguishable.** 正式 export 沒有 confidence / rejection reason；null 不能分辨 silence、gate rejected、correlation rejected。現有 correlation 證據只在研究 harness；不是 runtime 已支援。

**F-006 — Test blind spots.** 舊 pitch HTML 使用44.1k、4096，range property 遇 null 可直接 pass，也沒有 cents accuracy 或 coverage gate；舊 audio HTML 測複製的 rmsGate，沒有 import 正式 getFilteredBuffer。新 harness 測真實 gate 與 detector，保留這些產品失效結果，不把6項 control checks pass 包裝成 pitch品質全部通過。

## 6. Filter Findings — calculated, not browser-measured

按 [W3C Web Audio 2021 filter equations](https://www.w3.org/TR/2021/REC-webaudio-20210617/#filters-characteristics) 計算 bandpass coefficients。自行撰寫 recurrence 與 complex frequency response，並用110/440/880Hz 的穩態 RMS ratio 交叉核對（gain 絕對差 <0.002 是 harness 計算一致性檢查，不是產品門檻）。

| Frequency | Calculated gain dB @48k |
|---|---:|
| 80Hz | -25.412 |
| E2 82.407Hz | -25.137 |
| 110Hz | -22.390 |
| C3 130.813Hz | -20.654 |
| 220Hz | -14.561 |
| C4 261.626Hz | -11.901 |
| 440Hz | 0.000 |
| 880Hz | -14.570 |
| C6 1046.502Hz | -16.825 |
| 1200Hz | -18.425 |

Half-power (-3.0103dB) edges：44.1k 381.641–507.270Hz；48k 381.636–507.278Hz。它不是寬頻人聲 bandpass。低音基頻與高音會衰減、改變 harmonics 相對比例，再與0.01 RMS gate 產生選頻偏差。

線性濾波器不會把穩態單一 sine 的實際頻率「調高／調低」；它會改變振幅與相位，有限窗口/現有估計器因此可能得到不同估計誤差。複合聲音會改變音色與 harmonic balance。不能把 filtered A5 的不同 cents 當成物理 detuning。對440Hz加噪的改善也是中心頻率特例。

建議後續以 bypass 作 baseline，再比較合適的前處理；不要當下猜另一組 cutoff 或為了保留 C3 擅自降 RMS/clarity threshold。先保留既有設定作可重現 legacy baseline，修正註解與 DSP 實作應另有 bounded task。

## 7. Timing / Clock Findings

目前 main.js 在 audio init + UI init 後設 `startTime=performance.now()`；每 rAF 用 callback timestamp-startTime，傳給 score/lyrics/render；pitch PCM 沒有時間標記。`audioContext.currentTime` 完全沒用於現在的 frame timestamp。

依 [Web Audio currentTime / AnalyserNode](https://www.w3.org/TR/2021/REC-webaudio-20210617/#dom-baseaudiocontext-currenttime)，audio clock 是 graph 的 seconds，讀取 waveform 是最近 N 個 downmixed samples；它不是 microphone 硬體 capture timestamp。[High Resolution Time](https://www.w3.org/TR/hr-time-3/#dom-performance-now) 定義 performance.now 的 monotonic ms time base；[HTML animation callbacks](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames) 的 timestamp 是 rendering 時間。相同 ms 單位不代表相同事件／origin。

**Proposed mapping（未實作）：**

1. 來源接上並且 context running 時保存 session 的 audio-graph epoch `a0Seconds`；記錄附近的 performance.now() anchor 只供診斷。不以按鈕時間、辨識結果或第一次 render 當 capture 起點。
2. 若未來 source 提供可靠 sample index：`timestampMs=firstSampleIndex/Fs*1000`；durationMs=N/Fs*1000。第一個接收的 graph sample 定為index0；filter delay/硬體輸入延遲另記，不能宣称得到實際發聲時刻。
3. 若最小 M1 仍用 Analyser snapshot：讀取前後 bracket currentTime，近似 `endMs=(audioTime-a0Seconds)*1000`、`timestampMs=endMs-durationMs`。必須標 `analyser-estimate`，不能說 sample-accurate；讀取可能跨 graph update，精度 TBD。
4. 起始不足完整 N samples 時等待，不把負時間 clamp 成0後假裝完整有效窗。PCM 自帶連續時間、不是因每次 rAF 重新建立 epoch。
5. 每個 frame sequence 遞增，用來關聯輸出；sequence 不是 sample index。相同 snapshot/end time 不應重複分析；漏讀／重疊需明示，不可把 N/Fs 對每次 rAF 累加成有效演唱時間。
6. UI 只讀最新 PitchFrame，另用 performance.now 測 processing/display age。audio clock 可能 suspend，wall clock 仍走；初版遇 suspend/device loss 需顯示中斷，不能補造連續音訊。resume/重連是否結束 session 仍待核定。

`getOutputTimestamp()` 對映的是 output device，不會直接解決 microphone input latency。[API definition](https://www.w3.org/TR/2021/REC-webaudio-20210617/#dom-audiocontext-getoutputtimestamp)。不能用 outputLatency/baseLatency 宣稱 input end-to-end delay；實機輸入延遲、取樣／濾波 group delay、UI queueing 仍 TBD。

## 8. Recommended Smallest Contract — Proposed Only

保留 docs/09 的 AudioSource start/stop/getStream；不要把 FrameReader、DSP、UI 全塞入 source。

```text
AudioSource.start / stop / getStream
        -> source-specific FrameReader.readFrame() : AudioFrame | null
        -> PitchAnalyzer.analyze(frame) : PitchFrame
        -> existing UI adapter (future; no scoring formula change)
```

Mic reader 內部使用 Web Audio，Mock reader 用同一 schema 供 deterministic fixtures。null frame 表示本次沒有新完整資料，與「有資料但 silence」分開。先 pull 型 reader 可承接現有 controller；不宣稱這解決 rAF cadence，固定-hop／AudioWorklet 是否必要留待 browser量測。File/line-in/WebSocket 不在 M1 實作，未來只換 source/reader。

### Recommended AudioFrame

```js
// Proposed JSDoc shape, not production code
{
  sessionId,             // string
  sequence,              // non-negative integer; identity, NOT sample index
  timestampMs,           // session-relative start of represented window
  durationMs,            // samples.length / sampleRateHz * 1000
  sampleRateHz,          // actual analysis PCM rate; mic reader uses context.sampleRate
  samples,               // mono Float32Array, finite values; no implicit re-normalization
  timestampBasis         // 'analyser-estimate' | 'sample-index'
}
```

最小增加 sequence 和 timestampBasis；不強加假的精確 startSample。樣本不一定都在[-1,1]，混音可能超出；不得默默 clipping。來源資訊與 filter config 可在 session-level diagnostics 保存，不必重複複製每個 frame。

Ownership：同步 reader→analyzer 可借用既有 buffer，借用期限到下一次 readFrame；任何 queue/async consumer 必須取得自己的 bounded copy 或明確轉移 ownership。每窗不可無限累積。停止釋放 reader/source；確切 async capacity 仍 TBD。

### Recommended PitchFrame

```js
{
  sessionId,
  sequence,              // echoed input identity
  timestampMs,           // same window start as AudioFrame
  windowDurationMs,      // equals input durationMs
  frequencyHz,           // number | null
  midi,                  // continuous midiExact mapped here, NOT rounded midi
  cents,                 // 100*(midi-round(midi)), null if unavailable
  confidence,            // desired [0,1] diagnostic periodicity; see migration caveat
  status,                // valid | silence | low-confidence | invalid
  timestampBasis         // carried from input
}
```

cents 是相對最近半音，**不是本報告對 fixture 真值的 errorCents**。

Migration caveat：現在 detectPitch 丟棄 correlation，薄 wrapper 無法取得可信 confidence 或區分 null 原因。不能用 result!=null ? 1 : 0 填洞。建議 M1 只完成 source/reader 生命週期，不聲稱已交付完整 PitchFrame。M2 才以小型、經測試的 detector diagnostic return 補 confidence/status；0.9 的數值與校準仍待決策。若過渡期必須回傳結果，需另明示 legacy/unavailable schema，不能默默把 docs/09 的 number 改成假值。

低 RMS 只代表 low level，不必然真 silence；status vocabulary 是否需要 low-level/unavailable 必須在 M2 決策。這是概念 schema 的已識別缺口，本次保留為 Proposed，不直接改正式型別。

## 9. Preserve / Change Recommendations

**Preserve：** native ES modules；audio/pitch/UI 分檔；Hz↔MIDI utilities（0..127 round trip 通過）；detector 不依賴 DOM 且輸入未被改動；buffer reuse（但界定 ownership）；正式 RMS gate 的可測性；既有 UI/demo assets 與舊 tests 作 legacy regression。

**Change in bounded follow-ups：** 隔離 source acquisition 與 cleanup；補 source/frame clock 和品質資訊；改進 detector 的 normalization、peak validation、插值與 harmonic ambiguity（各自測試，不一次換算法）；重新評估窄bandpass＋gate；補2048/兩種Fs/coverage/cents測試，避免 null-vacuous success；量測後再決定 UI/audio cadence 解耦方式。**沒有在本次實作這些變更。**

## 10. TBD Items Partially Resolved

| TBD | 本次證據 | 仍未解決 |
|---|---|---|
| TBD-001 | 單機 Node detector call timing；2048 window duration 計算 | browser/device support、真實 CPU/latency、驗收上限 |
| TBD-002 | 目前沒有 capture timestamps；rAF 與 audio time 分離；提出 reader/ownership/estimated timestamp 最小 contract | browser snapshot精度、固定hop、suspend/resume與queue策略，需 M1 實測 |
| TBD-003 | filter response、RMS gate effect、現有 correlation 與插值失效已重現 | 新算法/門檻/calibration、stability/long-note thresholds 完全未定 |
| TBD-008 | 合成 harmonic mixture 證明高 correlation 仍錯 octave | 真實人聲／伴奏／多人的歸屬、可用率与品質 gate |

TBD-004 正式 scoring、TBD-005 recognition、AI/party 等皆未動。ADR-001/003/004/007 保持 Proposed，不因此報告自動 Accepted。

## 11. Remaining Unknowns

未測 browser BiquadFilterNode 數值／render graph、實體 mic sample rate與 constraints、權限與 autoplay、背景 tab、track ended、init error cleanup、start transient、noise 多 seed 分布、真實人聲 vibrato/glide/harmonics、KTV speaker leakage/clipping、手機 CPU、end-to-end latency。沒有跑原五頁 CDN browser suites。未做主唱分離；synthetic f0 success 不可當專業準確率。

## 12. Recommended Bounded Implementation Task for M1

**M1-A: Extract microphone source lifecycle and a testable snapshot-reader seam.**

只包含 MicrophoneAudioSource(start/stop/getStream)、一個 minimal FrameReader 與 test MockAudioSource；沿用現有 Web Audio/filter/pitch exports 作 legacy baseline，接上 source injection；明確處理 repeated start/stop、partial init failure、停止後不再交 frame；按本報告提案提供 timestampBasis/ownership，若 clock proposal尚未核定則先完成 source lifecycle，不捏造精確時間。

驗收：正式 mic permission/stop smoke test（另實測 browser）；mock拒絕／失敗 cleanup；source 可換而 core detector 無 navigator；readFrame 的 unique sequence與完整窗；停止不留 track/context；M0 replay 的數學輸出保持一致；scoring formula、assets、recognition、UI產品流程不變。對應 FR-002/003/019，FR-004只提供資料入口、不是整項完成。

先不要在 M1 同時修 pitch算法、換 filter、加入 stability或 result page。若優先修演算法，另立 M2 bounded task，明確比較本 baseline 的 false detections/coverage/cents；不能只因 controls pass 就宣稱問題解決。

## 13. Actual Verification and Outcome

- `node --check`：pass。
- Evidence harness：6 組 controls pass；8,352 observations 已記錄；6 項 F-001–006 問題仍存在，沒有修復。
- Deterministic replay：**pass**；source/harness hash、全部8,352 observations、fixtures/filter/controls 精確一致（不比較 CPU timing）。
- Browser/CDN test pages、real microphone、KTV：**Not run**。
- 沒有 production dependencies、new ML models、recognition、scoring 或任何不相關實作；新增的程式只有獨立研究 harness。
