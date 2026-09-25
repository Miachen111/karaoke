# ADR-001: Modular AudioSource Architecture

Status: Proposed
Date: 2026-09-25

## Context

現有 audioContext.js 把 getUserMedia 與 Web Audio pipeline 綁在一起；未來要支援 file、mixer、line-in、USB 與 stream。

## Decision

以可替換 AudioSource 管理 start/stop/getStream，Audio Pipeline 將來源轉為統一 AudioFrame。source acquisition 不進 core analyzer。具體 frame delivery / clock mapping TBD；本次不重構。

## Alternatives Considered

保留只有 initAudio 的 mic-only API：簡單但不符約束；立刻改成完整 native audio framework：目前無證據支持。

## Consequences

可用 mock 獨立測試、保留既有純分析；新增 lifecycle/ownership 的設計負擔。MediaStream 不是所有來源的必要型別。

## Revisit When

M0 量測或新來源證明 contract 不足時；見 FR-002、FR-019、TBD-002。
