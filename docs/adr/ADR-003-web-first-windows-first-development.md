# ADR-003: Web-first / Windows-first Development

Status: Proposed
Date: 2026-09-25

## Context

現有專案是 browser native ES modules，開發環境為 Windows；使用者希望可低設定使用，且不綁 Apple。

## Decision

維持 web-first / Windows-first 的初期開發方向，保留目前 JS/HTML/CSS 結構。確切 browser/device support matrix 量測後決定；不預先改 framework 或新增 backend。

## Alternatives Considered

立刻 native app、Apple-only SDK、改大型前端框架：目前沒有足夠需求／量測支持。

## Consequences

可延續 Kiro PoC；browser 權限、audio lifecycle、背景調度與 fingerprint 執行方式需驗證。Windows-first 不代表所有終端皆只支援 Windows。

## Revisit When

browser 限制有量測證據阻擋 MVP 或硬體整合需要新平台時；見 NFR-003/004。
