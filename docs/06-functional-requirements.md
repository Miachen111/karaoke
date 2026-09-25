# 06 — Functional Requirements

目標需求；Status 僅依 code inspection。驗收中 TBD 必須在對應實作前解決，不能以 mock 或任意常數視為通過。現有 Kiro Requirement 編號不等於本頁 FR。測試對照見 [test plan](13-test-plan.md)。

## FR-001 — 啟動獨立 session

Description: 從 idle / completed 開始建立獨立 session ID、相對時間起點與空白結果。

Priority: Must Have

Related Use Case: UC-001

Acceptance Criteria: 重啟後時間由 0 起、分數不沿用；重複開始不建立兩個 active session。

Status: 現有 main.js 有 idle/loading/running/stopped/error，無 session model。

## FR-002 — Microphone AudioSource

Description: 由 AudioSource adapter 管理 microphone，pipeline 接收來源而非直接綁死 navigator.mediaDevices。

Priority: Must Have

Related Use Case: UC-002、UC-011

Acceptance Criteria: 允許權限時取得 frames；拒絕／缺裝置時回報原因並可重試；用 MockAudioSource 可測同一分析入口。

Status: 現有 initAudio 直接取得 mic，尚無介面。

## FR-003 — 停止与資源釋放

Description: 結束 session 時停止 tracks、分析與 pending recognition，避免晚到事件改寫結果。

Priority: Must Have

Related Use Case: UC-007

Acceptance Criteria: 開始／停止／再次開始各只有一份資源；停止後無新增 frames 或計分；初始化中途失敗亦清理已取得資源。

Status: 現有 stopAudio 停止 tracks 並呼叫 close；完整 error cleanup 待驗證。

## FR-004 — Timestamped pitch estimates

Description: 持續從 active AudioSource 取得 AudioFrame，產生有 session-relative timestampMs、pitch 及 confidence 的 PitchFrame。

Priority: Must Have

Related Use Case: UC-005

Acceptance Criteria: 合成已知音高測試有 frequencyHz/midi/confidence；靜音或不可靠時 pitch 為 null；數值有限且 confidence 在 0–1；輸入不被 mutation。準確率容差與 confidence 校準 TBD。

Status: 現有 detectPitch 回傳 hz/midi/midiExact/noteName 或 null，沒有 timestamp/confidence。

## FR-005 — Basic pitch stability

Description: 在有效 pitch contour window 上計算穩定度與有效資料覆蓋狀態。

Priority: Must Have

Related Use Case: UC-005

Acceptance Criteria: 固定音高與波動 contour fixture 可比較；靜音不算穩定長音；門檻／window／單位採 scoring spec 核定版本。數值門檻 TBD，尚不能宣告通過。

Status: 未實作。

## FR-006 — Long-note detection

Description: 從連續有效 pitch frames 記錄長音起訖、durationMs 與 stability。

Priority: Must Have

Related Use Case: UC-005、UC-006

Acceptance Criteria: 合成持續音符合核定門檻時只產生一次事件；短音、缺資料、跳音依規則中斷；duration 依時間而非 frame count。門檻與 gap tolerance TBD。

Status: 未實作。

## FR-007 — Basic score engine

Description: Score Engine 僅依 PerformanceFeatures 與版本化 scoring spec 計算 ScoreBreakdown，不呼叫 provider 或 UI。

Priority: Must Have

Related Use Case: UC-005、UC-007

Acceptance Criteria: 同一有效輸入與 spec 得到同一結果；UI refresh rate 不改變分數；unknown 可評非 reference metrics；不足資料標 insufficient-data。總分公式與量尺 TBD，正式驗收待決策。

Status: 现有 +10/hit/frame 屬 legacy demo。

## FR-008 — Real-time game feedback

Description: Game Engine 將有效評分／特徵轉為 GameEvent，UI 顯示即時 entertainment feedback 與品質提示。

Priority: Must Have

Related Use Case: UC-006

Acceptance Criteria: 固定 fixture 產生預期事件且不重複；低 confidence 顯示不足資訊；pitch analyzer 不操作 DOM，game 不做 DSP；不宣稱專業準確度。事件門檻 TBD。

Status: 現有 Canvas HIT 與 debug UI；無獨立 Game Engine。

## FR-009 — Pluggable recognition PoC

Description: 透過 SongRecognitionProvider 接收 sample/fingerprint，回傳 normalized RecognitionResult。優先評估 AcoustID + Chromaprint，不預先採用。

Priority: Must Have

Related Use Case: UC-003、UC-010

Acceptance Criteria: 至少一個經審查 provider PoC 有可重現觀察；mock contract 覆蓋 match/no-match/timeout/unavailable/insufficient-audio/error；未設定 key 不冒充成功；不得在 scoring import vendor。timeout 值 TBD。

Status: 未實作。

## FR-010 — Unknown-song fallback

Description: 辨識無 match 或不可用時繼續分析／回饋／結果，不要求 notes/lyrics。

Priority: Must Have

Related Use Case: UC-004

Acceptance Criteria: 移除曲目資料且 provider timeout/unavailable 時仍能開始、演唱、結束；顯示 unknown；不顯示虛構 reference accuracy。

Status: 現有固定 assets 為必要，衝突 C-001。

## FR-011 — Result page

Description: 結束後展示 session result、score breakdown、可用 metrics、品質與 known/unknown 狀態。

Priority: Must Have

Related Use Case: UC-007、UC-008

Acceptance Criteria: 結果不再被晚到事件修改；無有效音訊顯示不足資料；標 experimental/specVersion；新 session 不沿用結果。

Status: 現有停止後保留畫面分數，無完整 result page。

## FR-012 — Basic rhythm

Description: 以 onset / beat 相關事件提供 basic timing 特徵與 confidence。

Priority: Should Have

Related Use Case: UC-005

Acceptance Criteria: fixtures 有明確時間戳；無可靠 beat/reference 時不產生『節奏正確率』；容差、演算法與 target 節奏来源 TBD。

Status: 未實作。

## FR-013 — Vocal range

Description: 從有效 pitch 範圍整理 session vocal range，排除不可靠片段。

Priority: Should Have

Related Use Case: UC-005、UC-008

Acceptance Criteria: 固定 fixture 的上下界可重現；離群點規則 TBD；不把混音偵測範圍標為醫學／專業聲域。

Status: 未實作。

## FR-014 — Combo

Description: 依核定有效 performance events 累計／中斷 combo。

Priority: Should Have

Related Use Case: UC-006

Acceptance Criteria: 重送事件不多加；低 confidence、中斷、換歌重置規則有測試；具體規則 TBD。

Status: 未實作。

## FR-015 — High-note event

Description: 對有持續性與可信度的高音產生遊戲事件。

Priority: Should Have

Related Use Case: UC-005、UC-006

Acceptance Criteria: 短暫錯誤 octave 不直接獎勵；個人相對／絕對音高基準及 duration 門檻 TBD，不能默定人人同一門檻。

Status: 未實作。

## FR-016 — Song metadata

Description: 有辨識 match 時提供可用 title/artist/provider identity，缺欄位允許 unknown。

Priority: Should Have

Related Use Case: UC-003、UC-008

Acceptance Criteria: 空 metadata 不使 UI crash；provider ID 不作跨服務統一歌曲 ID；有歌名不自動視為有 notes/lyrics/timecode。

Status: 未實作。

## FR-017 — Basic resync / song change

Description: 以明確時間映射處理可用 offset 或換歌，session clock 保持單調。

Priority: Should Have

Related Use Case: UC-009

Acceptance Criteria: fixture 中 song position 與 session timestamp 可分辨；無 offset 時顯示 unavailable；晚到舊 match 不套入新歌曲。觸發、誤判與分段政策 TBD。

Status: 未實作；demo 起點不是 KTV 播放時間。

## FR-018 — Vibrato candidate

Description: 以 pitch contour 周期與幅度找 vibrato-like pattern，標 experimental。

Priority: Could Have

Related Use Case: UC-005

Acceptance Criteria: 合成週期 contour 與隨機抖動可區分的驗收門檻 TBD；不宣稱專業 vibrato 診斷。

Status: 未實作。

## FR-019 — Replaceable AudioSource

Description: AudioSource 可替換為 file、line-in、USB、mixer 或 WebSocket stream；分析只見標準 frames。

Priority: Constraint now; extra adapters Could Have / Future

Related Use Case: UC-011

Acceptance Criteria: 介面測試以 mic/mock 餵相同 frames 得到相同分析結果；不以 MediaStream 非 null 作為所有未來來源必要條件；硬體 adapter 的實測另定。

Status: 尚無 abstraction；保留既有 Web Audio 模組。

## FR-020 — Future Party Mode

Description: 未來依獨立 party 規格支援輪唱、多人 ranking。

Priority: Could Have / Future

Related Use Case: UC-012

Acceptance Criteria: TBD：玩家／輪次／同分／跨歌公平性須先核定；未決定前不得實作或宣稱完成。

Status: 未實作；不納入本次。
