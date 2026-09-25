# ADR-007: Preserve Future Hardware Integration

Status: Proposed
Date: 2026-09-25

## Context

未來可能接 mixer、line-in、USB、KTV audio out 或 WebSocket；目前 main.js 有 ESP32 output no-op hook。

## Decision

保留 AudioSource 替換與標準 frames 邊界，不實作硬體功能；保留 ESP32 stub 但它不是 audio input adapter，也不是已完成硬體整合。

## Alternatives Considered

現在綁死 mic：違反約束；先建所有 hardware adapters：未有設備與需求，超出 MVP。

## Consequences

來源 sample rate/channel/clock/lifecycle 要能正規化；具體設備支援、熱切換與串流協定 TBD；不把 hardware roadmap 偷加進本期。

## Revisit When

真實硬體提供可測介面、量測顯示 direct input 有價值或使用者指定整合時；見 FR-019、UC-011。
