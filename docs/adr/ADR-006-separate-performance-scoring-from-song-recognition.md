# ADR-006: Separate Performance Scoring from Song Recognition

Status: Proposed
Date: 2026-09-25

## Context

舊 demo 用預載 notes 計 hit；新產品必須在不知道歌曲的情況仍提供娛樂回饋。辨識歌名不提供 note reference。

## Decision

Score Engine 僅依 PerformanceFeatures 與版本化 scoring spec；recognition 為獨立 context/metadata 路徑，failure 不阻斷 performance session。正式總分 TBD，保留舊 demo 但不當新標準。

## Alternatives Considered

先辨識／下載旋律才准評分：不符合 unknown fallback；把 provider response 混入 scoring：造成耦合。

## Consequences

需要非 reference 指標與品質顯示；不能聲稱唱對原唱。未來 reference-aware mode 必須另有合法資料、同步與獨立設計。

## Revisit When

確有授權 reference 與可驗證時間對齊且使用者要求該模式時；見 FR-007/010、scoring spec。
