# 02 — Scope and MVP

本表是目前暫定產品範圍，不是完成清單。新增功能須依 bounded task 推進；固定音階 demo 不等同完整 MVP。

## Must Have

| 能力 | Requirements |
|---|---|
| Microphone input、權限與停止釋放 | FR-001、FR-002、FR-003 |
| Timestamped pitch detection with confidence | FR-004 |
| Basic pitch stability | FR-005 |
| Long-note detection | FR-006 |
| Basic score engine | FR-007 |
| Game feedback | FR-008 |
| Song recognition PoC、provider abstraction | FR-009 |
| Unknown-song fallback | FR-010 |
| Result page | FR-011 |

Must Have 代表需要交付與驗收，並非門檻／總分公式已定。TBD 未解決前不能宣布 MVP 完成。

## Should Have

Basic rhythm (FR-012)、vocal range (FR-013)、combo (FR-014)、high-note event (FR-015)、song metadata (FR-016)、basic resync (FR-017)。沒有音樂 reference 時 rhythm 只描述可測特徵，不表示「唱對節奏」。

## Could Have

Vibrato candidate (FR-018)、multiplayer / party ranking (FR-020)、AI-generated performance summary、hardware input、KTV line-in (FR-019 未來實作)。預留可替換介面是目前 constraint，實作多種硬體 adapter 不是本期 Must Have。

## Out of Scope

本次文件任務不實作任何新功能。MVP 不自建完整歌曲庫、不要求站內選歌、不提供歌曲下載、不未授權抓取 Apple Music / Spotify / YouTube 音檔、不重新散布第三方串流。不把逐字歌詞與 target-note timeline 當必要前置條件。

Future research：advanced source separation、advanced music-context analysis、professional singing diagnostics、custom ML training。不是已承諾交付，也不可自行納入 MVP；大型 dataset 或從零訓練模型須另有研究必要性與決策。

## MVP Exit Gate

Must Have 對應 acceptance checks 通過；選定 scoring specification 版本且揭露 experimental 狀態；辨識失敗、資料不足及低 confidence 下保持誠實回饋；完成 M8 實境紀錄。量測門檻未定項見 [roadmap](14-roadmap.md)。
