# 04 — Use Cases

目標行為；不是現有功能清單。FR 對照見 [functional requirements](06-functional-requirements.md)。自動結束、換歌及多人尚待決策。

## UC-001 Start Scoring Session

- Actor: Casual KTV User。
- Preconditions: App 已開啟，沒有 active session。
- Trigger: 按開始。
- Main flow: 建立 session；走 UC-002、UC-003；辨識結果設定 known / unknown；進入 ready 後開始演唱。
- Alternative flow: 已有停止的 session 時建立新 session，不沿用舊分數。
- Exceptions: 音訊初始化失敗顯示可恢復錯誤；清理已取得資源。
- Postconditions: 成功有獨立 session，失敗無殘留音訊資源。

## UC-002 Grant Microphone Permission

- Actor: Casual KTV User / browser。
- Preconditions: 選定 microphone source。
- Trigger: 開始收音。
- Main flow: AudioSource adapter 請求權限；取得 stream；提供 frames。
- Alternative flow: 權限已授予時直接初始化；重試由使用者操作。
- Exceptions: 拒絕、沒有裝置、裝置占用或不支援時說明原因並提供重試。
- Postconditions: 成功有可停止的 source；拒絕時不偽造音訊。

## UC-003 Recognize Current Song

- Actor: Session controller / provider。
- Preconditions: AudioSource active，已取得足夠 sample。
- Trigger: 初次 listening 或明確重試。
- Main flow: 產生 RecognitionInput；透過 provider 呼叫；正規化為 RecognitionResult；match 則建立 known metadata。
- Alternative flow: no-match、timeout 或不足音訊走 UC-004。
- Exceptions: provider unavailable、network error、malformed response 均回傳可辨識失敗狀態。
- Postconditions: 辨識有界完成；不使 scoring 依賴第三方成功。

## UC-004 Continue in Unknown Song Mode

- Actor: Casual KTV User / controller。
- Preconditions: 辨識無可用 match，或辨識不可用。
- Trigger: UC-003 未成功。
- Main flow: 標示 unknown；不要求 notes 或 lyrics；照常取得 pitch 與可用 performance features。
- Alternative flow: 之後成功辨識可補 metadata；不得倒改已完成 session 的分數。
- Exceptions: 音訊本身失效則走音訊錯誤流程，不能以 unknown 掩蓋。
- Postconditions: 可繼續演唱、回饋、結束與看結果。

## UC-005 Analyze Vocal Performance

- Actor: Audio pipeline。
- Preconditions: active session 與有效 frames。
- Trigger: 新 audio frame。
- Main flow: 前處理；pitch/confidence；特徵抽取；產生 timestamped performance model。
- Alternative flow: 靜音或低 confidence 標示 unavailable，不假裝是有效音高。
- Exceptions: 格式錯誤、非有限值、亂序時間須有可觀測錯誤；精確處理策略 TBD。
- Postconditions: 只把有效證據與品質狀態交給 score engine。

## UC-006 Show Real-Time Feedback

- Actor: Casual KTV User。
- Preconditions: 有分析與評分狀態。
- Trigger: 新的 feature / game event。
- Main flow: UI 顯示 pitch、可用的娛樂分數與事件；揭露不確定狀態。
- Alternative flow: 低 confidence 提示音訊品質不足；未知歌仍可呈現非 reference 指標。
- Exceptions: UI 暫停或更新較慢不得重複累加分析事件。
- Postconditions: 回饋與實際分析一致，不作專業診斷。

## UC-007 Finish Performance

- Actor: Casual KTV User。
- Preconditions: active session。
- Trigger: 按停止／結束。
- Main flow: 停止 source、取消分析與 pending recognition；以現有有效資料計算 snapshot。
- Alternative flow: 資料不足仍可結束，結果標示 insufficient-data；自動曲末判定 TBD。
- Exceptions: 停止期間 provider 晚到回應不可改寫結果；cleanup 失敗需可觀測。
- Postconditions: session 結束、音訊釋放、結果固定。

## UC-008 View Result

- Actor: Casual KTV User。
- Preconditions: 已完成 session。
- Trigger: 完成計算。
- Main flow: 顯示 score breakdown、有效時長／品質、known / unknown 與 experimental 標示。
- Alternative flow: 無足夠資料顯示無法可靠評分；可開始新 session。
- Exceptions: 缺漏 metric 標 unavailable，不能補造滿分或零分冒充量測。
- Postconditions: 使用者可理解此結果的依據與限制。

## UC-009 Handle Song Change

- Actor: User / session controller。
- Preconditions: session 進行中。
- Trigger: 使用者指出換歌或偵測到候選變化。
- Main flow: 標記候選換歌；依後續核定的分段策略結束舊段或開始新段；重新辨識。
- Alternative flow: 不確定時保留 unknown；不得任意重置 session clock。
- Exceptions: 誤判或無 offset 時不虛構同步；自動判定與分數保留策略 TBD。
- Postconditions: 新舊歌曲資料不混算；完整流程待 FR-017 決策。

## UC-010 Change Recognition Provider

- Actor: Developer / configured adapter owner。
- Preconditions: 替代 provider 符合 contract，已完成 license/privacy review。
- Trigger: 開發設定選用另一 provider。
- Main flow: 替換 adapter 注入；執行 contract tests；驗證 success / failure normalization。
- Alternative flow: MockRecognitionProvider 用於離線測試，UI 不視為真實辨識成功。
- Exceptions: credentials 缺漏或服務失效走 unknown；切換中回應處置 TBD。
- Postconditions: 核心 scoring 無需變更；不承諾 MVP 的終端使用者切換選單。

## UC-011 Change Audio Source

- Actor: Developer；未來 Advanced / Hardware User。
- Preconditions: 替代 source 符合 contract。
- Trigger: 設定另一 source。
- Main flow: 停止原 source；初始化 adapter；交付標準 frames；驗證生命週期。
- Alternative flow: Mock / file 供測試；hardware adapter 屬 Future。
- Exceptions: 裝置移除或 source 初始化失敗須釋放資源；active-session 切換政策 TBD。
- Postconditions: 分析不依賴 navigator.mediaDevices；不承諾 MVP 熱切換 UI。

## UC-012 Future Party Mode

- Actor: KTV Party Group。
- Preconditions: 未來 party 規格與公平性決策完成。
- Trigger: 建立朋友競賽。
- Main flow: Proposed：識別輪次／玩家、完成個別 performance、展示排名。
- Alternative flow: 同分、不同歌或不同裝置比較方式 TBD。
- Exceptions: 不能可靠歸屬歌手時不把混合音訊分數當個人成績。
- Postconditions: Future；不在目前任務實作，驗收待獨立 scope。
