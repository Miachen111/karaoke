# ADR-002: Pluggable SongRecognitionProvider

Status: Proposed
Date: 2026-09-25

## Context

辨識候選包含 AcoustID/Chromaprint、ShazamKit、AudD、ACRCloud，尚未完成成本、條款、Windows 或 KTV noise 驗證。

## Decision

使用 recognize(input)→normalized result 的 provider abstraction；vendor payload、credentials 與 failure mapping 留 adapter。優先評估 AcoustID + Chromaprint 不是正式採用。

## Alternatives Considered

直接把 AcoustID API 放 scoring：違反替換性；一次整合所有服務：超出本期 scope。

## Consequences

需要 contract tests、timeout/cancel、no-match/unknown 路徑；可能需要 backend，尚未決定；mock 不等於真實服務驗證。

## Revisit When

PoC 發現平台／資料庫／offset／terms 不符時；見 FR-009、TBD-005/006。
