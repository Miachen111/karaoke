# ADR-004: No Custom ML Training in Initial MVP

Status: Proposed
Date: 2026-09-25

## Context

本期需要 entertainment scoring，不是專業 AI 聲樂老師；沒有理由預設大型訓練集與自訓模型。

## Decision

先用 DSP、open-source libraries、pretrained models、rule-based。AI enhancement 不是 prerequisite；初期不建立大型 training dataset 或從零訓練 neural network。

## Alternatives Considered

直接訓練端到端評分模型：資料、標註、驗證与維護成本未有必要性證據；只用單一 ML library 綁死核心：不採。

## Consequences

降低初期成本、提升可測試性；混音辨識能力仍可能有限，需誠實記錄；pretrained 模型也需 license/weight review。

## Revisit When

研究證明現有方法無法達成核定目標且有合法資料與驗證計畫時；另提 ADR，不自動啟動訓練。
