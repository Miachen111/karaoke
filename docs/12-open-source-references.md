# 12 — Open-source Reference Registry

公開 repo 不等於授權。本表是導入前的審查記錄，不是法律結論。優先 MIT / Apache-2.0 / BSD；GPL / LGPL / AGPL 先標記 copyleft 風險再決策；沒有明確 license 不 copy source、不直接衍生 implementation。模型權重、資料集、API terms、程式碼授權分開看。

目前僅盤點本機 imports，未完成外部 license/maintenance 研究；沒有在本次引入任何第三方程式。未查證欄位標 TBD，不猜 license。新增項目必須先 inspect LICENSE，再檢查相關 source，決定 dependency / adapted source / concept / reject 後才整合。

## Fixed Record Template

```text
REF-XXX

Project:
Repository:
Maintainer / Organization:
Version / Commit Reviewed:
Last Meaningful Update:
Review Date:
Evidence / License File URL:
License:
Purpose:
Usage Type:
- Dependency
- Modified Source
- Algorithm Reference
- Architecture Reference

Files / Components Referenced:

What We Use:

What We Do NOT Copy:

Required Attribution:

Copyleft Requirement:

Suitability for Public GitHub:

License Risk:

Maintenance / Project Need:

Decision:
- Adopt
- Experiment
- Reject
- Pending

Decision Rationale / Follow-up:
```

## REF-001

Project: fast-check

Repository: TBD — 由既有 npm CDN package metadata 確認官方 repository，尚未查證，不填猜測 URL。

Maintainer / Organization: TBD

Version / Commit Reviewed: 未鎖版；本機五個 HTML 使用 `https://cdn.jsdelivr.net/npm/fast-check/+esm`，本次未載入或確認其解析版本。

Last Meaningful Update: TBD — requires primary-source review

Review Date: 2026-09-25（僅本機盤點）

Evidence / License File URL: TBD；本機 evidence 為以下 imports。

License: TBD — 本次未檢查 upstream LICENSE；不可視為核准。

Purpose: 既有 property-based tests。

Usage Type: Dependency（test-only，既有使用；非本次新增）

Files / Components Referenced:

- `ktv-smart-scorer/tests/test-audio-context.html`
- `ktv-smart-scorer/tests/test-pitch-detector.html`
- `ktv-smart-scorer/tests/test-score-engine.html`
- `ktv-smart-scorer/tests/test-canvas-renderer.html`
- `ktv-smart-scorer/tests/test-lyric-display.html`

What We Use: CDN module 的測試 API；現有測試檔保留。

What We Do NOT Copy: 本次未複製 upstream source，也不納入 production runtime。

Required Attribution: TBD — inspect LICENSE at selected version

Copyleft Requirement: TBD — 不憑 public/npm presence 推定

Suitability for Public GitHub: Pending license / attribution review

License Risk: 未確認 license、未鎖版本與 CDN/transitive dependency 可重現性風險。

Maintenance / Project Need: 需求為既有 property tests；維護現況 TBD。

Decision: Pending

Decision Rationale / Follow-up: 在新增、升級或正式依賴此測試工具前，確認官方 repo、license、maintainer、last meaningful update、版本／傳遞依賴並記錄 attribution；本次不改舊測試。

## Pending Candidate Intake

AcoustID / Chromaprint、pitchy、CREPE、torchcrepe、Basic Pitch 尚未導入，後續每個实际使用 repo 各建 REF 編號。YIN 的 paper 與具體 code implementation 分開登錄。ShazamKit、AudD、ACRCloud 另需 service/SDK terms review，不因出现在候選表就視為 open-source。

舊 Kiro design 提到 uvu 只是可選測試工具，未在現有程式發現 import；若將來採用才先登錄審查。既有 handwritten pitch source 的外部衍生來源在本機未見紀錄：provenance TBD，不能由註解推定來源或侵權。

Root 沒有 LICENSE；專案自身公開授權由擁有者決定（TBD-009），本次不代選 license，也不代表第三方 license 義務可以忽略。
