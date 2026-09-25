# 11 — Technical Evaluation

## Decision Process

此頁是 research backlog / decision matrix，**未完成供應商或演算法研究，不宣稱任何候選最好**。TBD 表示尚未查證，不是缺乏該能力。填寫結論必須附 primary source URL、查閱日期、version/commit、測試環境與觀察；價格／平台／license 不凭印象。服務條款與 library license 分開審查。

初始傾向先評估 AcoustID + Chromaprint：使用者希望驗證開源 audio fingerprint 流程、低成本研究 PoC 與 Windows 開發可行性。這是評估動機，**不是已確認服務免費、可商用或能在現場 KTV 可靠辨識**。fingerprint tooling、辨識資料庫與 API 是不同層；不得直接綁入 scoring。

## Song Recognition Decision Matrix

| Criterion | AcoustID + Chromaprint | ShazamKit | AudD | ACRCloud |
|---|---|---|---|---|
| Cost / quota / research terms | TBD | TBD | TBD | TBD |
| License / API terms | TBD | TBD | TBD | TBD |
| Platform | TBD | TBD | TBD | TBD |
| Windows dev | TBD | TBD | TBD | TBD |
| Web support / backend need | TBD | TBD | TBD | TBD |
| Recognition database / 華語涵蓋 | TBD | TBD | TBD | TBD |
| KTV noise robustness | TBD — real KTV test | TBD — real KTV test | TBD — real KTV test | TBD — real KTV test |
| Offset/timecode semantics | TBD | TBD | TBD | TBD |
| API complexity | TBD | TBD | TBD | TBD |
| Vendor lock-in | TBD | TBD | TBD | TBD |
| Offline possibility | TBD | TBD | TBD | TBD |
| PoC suitability | Pending spike | Pending research | Pending research | Pending research |
| Primary sources / checked at / version | TBD | TBD | TBD | TBD |

離線 fingerprint generation 不等於離線 song recognition。比較是否傳原音或 fingerprint、minimum sample duration、連線中斷／quota、timeout、credentials、資料保留；若需要 backend，先記 ADR，不把 API secret 放 browser。

## Pitch Detection Decision Matrix

| Criterion | YIN | pitchy | CREPE | torchcrepe | Basic Pitch |
|---|---|---|---|---|---|
| Real-time | TBD | TBD | TBD | TBD | TBD |
| Browser | TBD | TBD | TBD | TBD | TBD |
| CPU | TBD | TBD | TBD | TBD | TBD |
| Accuracy | TBD | TBD | TBD | TBD | TBD |
| Polyphonic tolerance | TBD | TBD | TBD | TBD | TBD |
| Model size / N/A verification | TBD | TBD | TBD | TBD | TBD |
| License (code/model separately) | TBD | TBD | TBD | TBD | TBD |
| Ease of integration | TBD | TBD | TBD | TBD | TBD |
| Primary sources / version / benchmark | TBD | TBD | TBD | TBD | TBD |

YIN 是算法名稱，需先選具體 implementation 才能評 license；现有 pitchDetector 是自相關 implementation，註解的「YIN-inspired」不等同已驗證標準 YIN。Basic Pitch 等候選須確認任務輸出是否適合即時單音 f0，不先假定可直接替換。

## Other Research Directions

Rhythm：onset detection / beat tracking；Vibrato：pitch contour 周期／幅度；必要時才評估 pretrained audio models。先使用 lightweight DSP、open-source libraries、rule-based；不建立大型 training dataset 或從零訓練 neural network。

## M0 Audio Evidence — Spike Definition

問題：現有 mic→filter→pitch 是否能在預定環境提供可用且可測的 pitch evidence？哪些最小 contract 能隔離 source 與 UI？

輸入：現有模組、合成音階／silence／noise fixtures；經同意的短時現場試唱，預設不存 raw audio。先不加 dependency、不修改正式公式。

交付：記錄裝置／browser/sample rate、filter response、known-tone pitch error、voiced coverage、CPU 與延遲、不同 render cadence 的觀察；提出 AudioSource→AudioFrame 與 clock mapping 小型 contract；記錄現有演算法失效情況與下一步建議。不得把觀察到混音 f0 稱為已分離主唱。

Exit：可重現 report 與明確「保留／待修／另評估」清單，更新 TBD-001/002/003/008；數值驗收門檻基於量測另核定。不在 spike 中順便完成新 scoring。

後續 recognition spike：先查授權／來源並登錄 registry，再驗證 Windows fingerprint→provider→normalized result→timeout/unknown；採清晰可用權利的 fixtures，不下載商業音樂建歌庫。將 offline/local 步驟與 remote API 結果分開記錄。

## M0 Evidence Collected

[M0 report](evidence/m0-audio-evidence.md) 與 [JSON](evidence/m0-audio-results.json) 已記錄29種合成fixtures、兩種sample rates、2048/4096窗、三條路徑，共8,352 observations且replay一致。正式RMS/pitch exports直接受測；bandpass為W3C公式計算／自行實作simulation，沒有browser/mic/KTV量測。

現有算法有低頻拒絕、邊界誤峰、插值方向與octave問題；現有filter的half-power band約382–507Hz。不能用這組資料宣布YIN/pitchy/CREPE等候選勝負；上方候選matrix維持TBD。未研究或加入recognition。

下一個bounded implementation建議M1-A：MicrophoneAudioSource生命周期、mock與minimal reader seam；見report section12。DSP改進另立M2 task，不與來源抽象一次混改。
