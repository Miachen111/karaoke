# 13 — Test Plan

## Status and Evidence Policy

這是計畫，不是通過報告。現有五頁 browser tests 保留；Kiro tasks 打勾不視為本次執行證據。所有新 FR 未因建立 docs 而完成。紀錄 command/URL、commit、OS/device、browser/version、input、seed（若有）、expected/actual、pass/fail/blocked；未執行寫 Not run，TBD 門檻寫 Blocked by decision。

## Existing Regression Tests

從 repo root 以 README 的 localhost server 開啟：

- `http://localhost:8000/ktv-smart-scorer/tests/test-pitch-detector.html`
- `http://localhost:8000/ktv-smart-scorer/tests/test-score-engine.html`
- `http://localhost:8000/ktv-smart-scorer/tests/test-audio-context.html`
- `http://localhost:8000/ktv-smart-scorer/tests/test-canvas-renderer.html`
- `http://localhost:8000/ktv-smart-scorer/tests/test-lyric-display.html`

五頁依賴外部 fast-check CDN（REF-001 Pending）。失敗要區分 CDN/環境與 assertion。舊 score tests 測 +10 per hit 的 legacy 行為，不能用來宣稱新 score engine 通過。不為文件任務新增 dependency 或假造自動化 browser pass。

## Unit Test

| ID | 目標 / Requirement | Input / Acceptance Criteria |
|---|---|---|
| UT-001 | Pitch conversion / FR-004 | 已知 A4=440Hz→MIDI69、MIDI↔Hz round trip；有效範圍、輸入不變；非法值處理在 contract spike 核定 |
| UT-002 | Pitch estimates / FR-004 | synthetic sine、silence、noise、octave mixtures；time/confidence 格式、null、finite 合格；實際 pitch error 容差 TBD |
| UT-003 | Score calculation / FR-007 | 核定 spec + 相同 features 得相同結果；改 UI FPS 不變；無有效資料為 insufficient-data；總分 expected values 待正式公式 |
| UT-004 | Provider adapter / FR-009、FR-010、FR-016 | match/no-match/timeout/unavailable/malformed/cancel；normalized status，metadata 可缺，no raw vendor payload 進 core |
| UT-005 | State machine / FR-001、FR-003、FR-011 | start/stop/restart、中途失敗、late response；無重複 session、無已停止 session 加分、結果不可被晚到事件改寫 |
| UT-006 | Stability / long note / FR-005、FR-006 | 穩定、漂移、跳音、gap、silence contours；正確 durationMs、去重；window/threshold/gap expected 值待 TBD-003 |
| UT-007 | Rhythm / range / FR-012、FR-013 | timestamped onsets、已知範圍／離群 pitch；缺 reference 不產生 accuracy；離群與節拍容差 TBD |
| UT-008 | Game rules / FR-008、FR-014、FR-015 | 重送事件不重複獎勵；低 confidence 明示；combo/reset/high-note 門檻決策後補 fixtures |
| UT-009 | Offset mapping / FR-017 | 已知 anchor 對映正確；null offset 不造 0；late old-session result 丟棄，session clock 不重置 |
| UT-010 | AudioSource contract / FR-002、FR-003、FR-019 | MockSource start/stop/failure；停止不再交 frames；非 MediaStream bridge 可測；核心無 navigator 依賴 |
| UT-011 | Vibrato candidate / FR-018 | periodic contour 與 jitter 對照；輸出標 experimental；辨識門檻 TBD，不列 Must Have |
| UT-012 | Party logic / FR-020 | Future；玩家輪次、同分及可比性規格核定後再設計，不假造目前驗收 |

## Integration Test

| ID | Flow | Acceptance Criteria / FR |
|---|---|---|
| IT-001 | Microphone → Audio Pipeline → Pitch Analyzer | 使用者授權後可取得帶時間／confidence 資料；拒絕、missing device 可恢复；停止釋放 tracks；FR-001–004、FR-019 |
| IT-002 | Recognition provider → RecognitionResult | reviewed provider fixture 或經允許 sample；成功正規化，timeout/unavailable 後仍進 unknown；mock 與真實服務結果分列；FR-009、FR-010、FR-016 |
| IT-003 | PerformanceFeatures → ScoreEngine → GameEngine → UI | 核定 fixtures 產生一致結果；低品質不冒充分數；render cadence 不改積分；FR-005–008、FR-014、FR-015 |
| IT-004 | Unknown session → finish → result | 無 notes/lyrics、provider offline，仍可演唱與結束；result 標 unknown/品質/specVersion；FR-010、FR-011 |
| IT-005 | Stop/restart/error lifecycle | 初始化各階段注入失敗；無殘留 tracks、pending 回應不改舊結果；FR-003、NFR-007 |
| IT-006 | Song change / resync | 有 offset 正確映射、無 offset 降級；不把舊 metadata 套新 session；FR-017，分段政策 TBD |
| IT-007 | Privacy / dependency boundary | 檢查 network、storage、logs；raw audio 無永久儲存，third-party 傳送內容有文件；core 無 vendor / DOM imports；NFR-005、006、010、011 |

## Real Environment Test

真實 KTV 測試不得只測乾淨 sine。先取得參與者同意，預設保存匿名量測與觀察，不保存商業歌曲或完整現場音訊。測試權利來源、場地限制與第三方傳送政策須記錄。

| Dimension | Cases | 要記錄 / Acceptance |
|---|---|---|
| 歌曲 | 不同歌曲、華語歌曲、不同速度與伴奏配置 | recognition 正確/錯誤/unknown 數量與分母；known 不等於 reference；FR-009、FR-010 |
| Vocal range | 男／女聲及不同實際音域 | 用實際 Hz/MIDI 範圍分組，不以性別硬定門檻；pitch confidence/coverage、octave errors；FR-004、FR-013 |
| 手機位置 | 桌面、靠近演唱者、不同方向 | 距離／方向／設備與可用 frame 比率；FR-004 |
| 包廂音量 | 低／中／高的可重現設備設定 | latency、clipping/失效、quality hints；NFR-001、FR-008 |
| 多人說話 | 單人演唱、朋友交談、合唱 | 錯誤事件／false confidence；不可宣稱分離主唱；FR-005–008 |
| 喇叭距離 | 不同距離與回音条件 | recognition success、pitch confidence、背景伴奏誤判 |
| 失效恢復 | 網路中斷、provider 不可用、拒絕 mic、低 signal | 辨識失敗仍可評可用特徵；mic 不可用明示不可分析；FR-002、FR-010 |
| 完整一輪 | 開始→唱→停止→結果→再開始 | 無殘留資源、結果不串場、品質與模式一致；FR-001、003、011 |

數值成功率、最低 confidence coverage、latency 與 sample size：TBD — requires measurement。先報告分布與失敗案例，再由擁有者核定 MVP gate；沒有門檻不能寫「真實 KTV 已通過」。識別成功率分母需包含所有嘗試，timeout 不可排除美化結果。

## Documentation-only Validation

文件初始化適用：檢查 00–14、AGENTS、ADR 存在且非空；12 UC 欄位、FR 欄位、ADR Status/Date/sections；Markdown 相對路徑、ID 對照與 code fences；git diff 確認 runtime/tests/assets/.kiro 完全未改。Mermaid 語法可人工檢視；若未 render，報告不可宣稱已渲染驗證。

## M0 Executed Evidence — Synthetic Only

[Research report](evidence/m0-audio-evidence.md) 記錄本次實際commands、fixtures、環境、coverage/cents/false detections、CPU scope與失效。Node harness `ktv-smart-scorer/tests/m0-audio-evidence.mjs` 無外部dependency，直接測production `getFilteredBuffer` / `detectPitch`。6組controls pass，8,352觀察已完成deterministic replay；不代表FR-004的timestamp/confidence或產品準確率驗收通過。

補足UT-001/002部分證據：2048與4096、44.1k與48k、silence/sine/低振幅/noise/harmonic mixture、input immutability。現有HTML pitch tests null-vacuous pass與複製rmsGate的限制已登錄C-014。原browser suites、IT-001真實mic、KTV測試均Not run。來源生命周期與browser filter/clock仍需M1驗證。

## Release Gate

Must Have FR 對應 unit/integration 與實境 evidence 完成；未完成／failed/TBD 明列；沒有把 Mock provider 成功當線上成功。Should/Could 不阻擋文件初始化，是否阻擋產品 milestone 依 scope。
