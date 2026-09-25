# ADR-005: Open-source License Review Policy

Status: Proposed
Date: 2026-09-25

## Context

既有 tests 使用 fast-check CDN 但缺少審查登錄；未來會大量參考 GitHub。Public 不等於可複製。

## Decision

使用前登錄 repo/project/license/maintainer/update/purpose/usage/attribution/copyleft/public suitability；優先 MIT/Apache-2.0/BSD；GPL/LGPL/AGPL 先標風險；沒有明確 license 不 copy 或直接衍生 source。

## Alternatives Considered

不查授權就 copy：不採；全面禁止 open source：不符合需求；只看 repository visibility：不是授權依據。

## Consequences

需要維護 registry 和 version evidence；不自動採用 root LICENSE；REF-001 既有使用列 Pending，不掩蓋歷史。

## Revisit When

實際 license、分發方式或服務條款改變時，重新審查；見 AGENTS 與 reference registry。
