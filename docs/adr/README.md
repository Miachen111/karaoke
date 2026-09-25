# Architecture Decision Records

以下初始 ADR 均為 **Proposed**，不是 Accepted。使用者已明確指定的架構 constraints 仍有效；Proposed 表示具體實作與 trade-offs 待驗證。本次不以建立 ADR 的方式批准 framework migration。

| ADR | Title |
|---|---|
| [ADR-001](ADR-001-modular-audio-source-architecture.md) | Modular AudioSource Architecture |
| [ADR-002](ADR-002-pluggable-song-recognition-provider.md) | Pluggable SongRecognitionProvider |
| [ADR-003](ADR-003-web-first-windows-first-development.md) | Web-first / Windows-first Development |
| [ADR-004](ADR-004-no-custom-ml-training-in-initial-mvp.md) | No Custom ML Training in Initial MVP |
| [ADR-005](ADR-005-open-source-license-review-policy.md) | Open-source License Review Policy |
| [ADR-006](ADR-006-separate-performance-scoring-from-song-recognition.md) | Separate Performance Scoring from Song Recognition |
| [ADR-007](ADR-007-preserve-future-hardware-integration.md) | Preserve Future Hardware Integration |

評估完成後記錄 evidence、決策者與狀態變更；Accepted 需有明確決策依據，不能因時間經過自動接受。被取代的 ADR 保留並連到 replacement。

## Template

```markdown
# ADR-XXX: Title

Status: Proposed
Date: YYYY-MM-DD

## Context

## Decision

## Alternatives Considered

## Consequences

## Revisit When
```
