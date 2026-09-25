# 10 — Scoring Specification

文件狀態：Confirmed concepts + Proposed metrics。正式 scoring specVersion、總分尺度與公式：**TBD**。不把現在 demo 的分數解讀為真實 KTV 唱功評等。

## Confirmed Concepts

產品評分是 entertainment-oriented performance scoring，非專業聲樂診斷。優先 DSP / rule-based，不以 AI 或自訓模型為前提。Unknown Song Mode 必須有意義地工作；辨識 metadata 不提供 note reference，不可由歌名推算旋律正確率或原唱相似度。

品質是評分的前提：silence、低 confidence、資料缺漏不應偽造成穩定音、好表現或專業判斷。Pitch confidence 是觀測品質，不等同演唱好壞。應按有效時長／事件計算並記錄 coverage，不依 UI frame count。只有已核定的 metric/rule version 可用於結果；實驗指標必須標示 experimental。

混音可能包含伴奏與其他人聲；偵測到 pitch 不證明它來自使用者。Range 廣、高音高、長音長或穩定本身不代表音樂表現必然更好。

## Existing Legacy Demo — not the new standard

`ktv-smart-scorer/src/scoring/scoreEngine.js` 的既有行為：

- active note 滿足 `start <= currentTimeMs < end`。
- `abs(detectedMidiExact - target.pitch) <= 0.5` 為 hit。
- 每次 evaluate 的 hit 加 10；其他情形不扣分；每次 evaluate 增加 totalEvaluations。
- main.js 每個 rAF 呼叫 evaluate，因此分數依 frame cadence、時長、target notes 而變。
- notes fixture 僅 0–5000ms C3–G3；超出後没有 target。

以上保留作 legacy regression，不是本版正式 formula，也不能映射成「滿分 100」。原測試通過不等於滿足 FR-007。

## Proposed Metrics

| Metric | 可觀測定義方向 | 依據與限制 | 尚待決策 |
|---|---|---|---|
| Pitch Stability | 有效 contour 在 window 內的 cents dispersion | 不是距原唱音高誤差；滑音／換音須分段 | window、統計量、segmentation、門檻 |
| Pitch Confidence | 有效 frames 的品質與 coverage | algorithm-specific；不能當唱功加分捷徑 | confidence calibration、min coverage |
| Long Note Duration | 合格連續片段的 endMs-startMs | silence 不延長；短缺口處置需明確 | 最短時長、gap tolerance |
| Long Note Stability | 該長音片段的音高 dispersion | 自然 vibrato 不必然算不穩 | 與 stability/vibrato 的去重規則 |
| Timing | onset/beat 相對事件與變化 | 無 reliable reference 時不是節奏正確率 | beat source、對齊、tolerance、可用條件 |
| Vocal Range | 合格 pitch 的 min/max MIDI | 僅本次可觀察範圍，非個人專業音域 | 去離群、最小持續時長 |
| Pitch Trend | session-relative pitch contour 的趨勢摘要 | 非旋律正確性 | sampling/downsampling 與顯示 |
| Combo | 合格 GameEvents 的連續達成 | 遊戲規則，不是 DSP 準確率 | break/reset/dedup、低品質處理 |
| Game Bonus | 核定遊戲事件 bonus | 與底層音訊指標分離、避免重複獎勵 | 上限、重複、版本與總分關係 |

## Experimental Metrics

Vibrato Candidate：先取得可信 pitch contour，再分析周期性、rateHz、extentCents；不是專業 vibrato 診斷。頻率／幅度範圍、排除 jitter／octave errors 的方法與驗收 TBD。

High-note Event：娛樂事件，需處理短暫錯誤 octave 與個體差異。相對個人 baseline 還是絕對 Hz、持續時長與獎勵規則 TBD。不可因規則鼓勵使用者勉強挑戰音域。

Candidate Formula A（experimental research direction，**非實作授權**）：先篩選有效 features，再以有效時長校正的 metric mapping 得到各項展示值，最後另列 game bonus。mapping、權重、分母、總分尺度、上限全部 TBD；沒有 40%/30%/20% 預設值。也可先驗證 metric feedback 而不假造總分。

## TBD

正式公式／總分尺度／specVersion；門檻校準；靜音、缺資料、長 gap；不同歌曲／時長／裝置的可比性；低 confidence 時 combo 是否暫停；notes/reference-aware mode 是否另立；timing reference；anti-noise 與 octave error；各 metric 是否真正值得成為分數。

不足資料的結果應有 `insufficient-data` 和 null score，不拿零分偽裝量測。實作前需解決該 bounded task 所用的 TBD，更新 FR acceptance 及 test fixtures。驗收至少涵蓋同一時間資料在不同 render FPS 下不改分數、unknown mode、silence 和低品質輸入。
