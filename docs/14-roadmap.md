# 14 — Roadmap

使用 milestone，不承諾日期。一次一個 bounded task，未來功能須明確要求。M0 文件基礎已建立不代表 M0 技術 spike 完成；現有 Kiro PoC 不代表 M1–M7 已按新 spec 驗收。

| Milestone | 範圍 | Exit evidence |
|---|---|---|
| M0 — Architecture & Technical Spike | 文件、現況盤點、source/frame/clock contract、pitch baseline；規劃 fingerprint spike | conflicts/TBD 清單、量測報告、可審查 ADR；先不改正式公式 |
| M1 — Audio Input | microphone adapter、生命週期與 MockAudioSource 邊界 | FR-001–003、FR-019 contract checks；拒絕與 cleanup |
| M2 — Pitch Pipeline | timestamp/confidence、純分析測試與時鐘映射 | FR-004，已核定容差與有效資料準則 |
| M3 — Basic Performance Features | stability、long note；Should features 按需求另拆 | FR-005、FR-006 fixtures；coverage/threshold 決策 |
| M4 — Score Engine | 與 recognition/UI 分離，版本化娛樂公式 | FR-007；公式先文件核定，deterministic / FPS-independent tests |
| M5 — Game Feedback | 基本事件與品質提示、結果展示；combo/high-note 另定 | FR-008、FR-011；可用完整結束流程 |
| M6 — Song Recognition PoC | 經審查 provider、normalized errors、metadata 可用性 | FR-009、FR-016；Windows/fingerprint/API evidence；不預設一定採 AcoustID |
| M7 — Unknown Song Mode | 端到端整合與 failure regression | FR-010；無曲目檔、timeout、offline 仍可演唱與結果 |
| M8 — Real KTV Testing | 音量、距離、華語、多聲源與 devices | test plan 結果／限制；訂數值門檻，不造準確率 |
| M9 — Advanced Features | 選定 rhythm/vibrato/summary 等獨立研究 | 新 scope、license/spec/tests；非自動包含所有 Future |
| M10 — Party Mode | 輪唱、多人成績／ranking | FR-020 決策後驗收公平性、玩家歸屬與邊界 |
| Future — Hardware Integration | mixer、line-in、USB、KTV audio out、stream | 保持 AudioSource 可替換，逐 adapter 實測 |

Unknown fallback 是從 M1 開始的架構約束，M7 是完整驗收點，不得先設計成 M6 成功才可唱。M4/M5 用 synthetic features 驗證，不依賴真實 provider。FR-017 resync 需 offset 證據；不先承諾 provider 有 timecode。

## Missing Decisions / TBD Register

| ID | Decision | Needed by | Evidence / Owner |
|---|---|---|---|
| TBD-001 | 支援 browser/devices、latency/CPU 目標 | M0–M2 | 開發者量測；擁有者確認支援範圍 |
| TBD-002 | source push/pull、buffer ownership、AudioContext→session clock、gap/order | M1–M2 | contract spike / ADR review |
| TBD-003 | pitch confidence、stability window、long-note 門檻、filter response | M2–M3 | 合成與實境基線；spec 更新 |
| TBD-004 | 總分尺度、公式、normalization、遊戲 bonus、specVersion | M4 | 功能證據與擁有者決策；禁止沿用 demo 當標準 |
| TBD-005 | recognition provider、sample duration、timeout、cost/license、Windows 流程 | M6 | primary sources + fingerprint PoC |
| TBD-006 | 第三方傳音/fingerprint、backend/secrets、consent、retention/暫存上限 | 在任何 remote recognition 前 | provider review + 架構／privacy 決策 |
| TBD-007 | 曲末、換歌、resync、session 分段、offset mapping | FR-017 實作前 | 使用情境與 provider evidence |
| TBD-008 | 真實混音 f0 能否代表主唱、品質 gate 與實境驗收門檻 | M0、M8 | noise / 多人 / speaker distance 量測 |
| TBD-009 | root LICENSE、既有第三方 registry、provenance、CDN pinning | 新增 dependency / 公開授權前 | 擁有者選專案 license；開發者查 upstream |
| TBD-010 | Combo/high-note/timing/range/outlier/vibrato thresholds | 各 Should/Could task 前 | 獨立 spec + fixtures |
| TBD-011 | session result/detail 保留與重啟 UX、錯誤恢復細節 | M5 | 產品決策；預設無永久 raw audio |
| TBD-012 | Party 玩家識別、同分／跨歌公平性、共享裝置 | M10 | 新 scope，不自行建立帳號或聲紋 |

## M0 Evidence Status and Next Bounded Task

[M0 Audio Evidence report](evidence/m0-audio-evidence.md) 已完成synthetic/calculation evidence與deterministic replay，提出AudioSource→FrameReader→AudioFrame→PitchAnalyzer→PitchFrame最小contract。尚未完成browser/microphone/KTV量測，不把M0全項標完成，未啟動recognition。

TBD-001部分解答：本機Node detector timing與window duration已記錄；browser/device目標仍TBD。TBD-002部分解答：無capture timestamp與borrowed-buffer問題已確認，clock/reader提案待M1驗證。TBD-003部分解答：filter response、RMS/clarity效應、插值問題已重現，新的DSP/feature門檻仍TBD。TBD-008部分解答：合成octave mixture能有高correlation卻錯音高，真實KTV仍未驗證。其他TBD未改。

下一步建議 **M1-A：MicrophoneAudioSource生命周期＋minimal snapshot-reader seam**，精確範圍與驗收见report section12；不順便修DSP、改分數或加入recognition。既有production未改；新增研究harness不是MVP實作。ChatGPT doc橋仍未建立。
