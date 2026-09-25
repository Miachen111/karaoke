# Documentation Index

初始化日期：2026-09-25。依據：使用者產品指示與本機 repository inspection；不是外部市場調查或效能 benchmark。

**Confirmed** 是明確產品約束；**Existing** 是 code inspection 所見，不代表已通過實機驗證；**Proposed / Experimental** 不是正式決策；**TBD** 是尚無決策或證據。目標功能除明示 Existing 外，不代表完成。

| 文件 | 職責 |
|---|---|
| [00 Product vision](00-product-vision.md) | 定位、價值與非目標 |
| [01 Problem statement](01-problem-statement.md) | 痛點與待驗證假設 |
| [02 Scope and MVP](02-scope-and-mvp.md) | 優先級與範圍 |
| [03 Stakeholders and personas](03-stakeholders-and-personas.md) | 角色與需求 |
| [04 Use cases](04-use-cases.md) | UC-001–012 |
| [05 User flow](05-user-flow.md) | 主流程與錯誤流程 |
| [06 Functional requirements](06-functional-requirements.md) | FR-001–020 與驗收 |
| [07 Non-functional requirements](07-non-functional-requirements.md) | NFR-001–012 |
| [08 System architecture](08-system-architecture.md) | 現況、目標與衝突登錄 |
| [09 Data and interfaces](09-data-and-interfaces.md) | Conceptual JS contracts 與時間標準 |
| [10 Scoring specification](10-scoring-specification.md) | 已知、候選、實驗、TBD |
| [11 Technical evaluation](11-technical-evaluation.md) | 待研究 matrix 與 spike |
| [12 Open-source references](12-open-source-references.md) | 來源與授權登錄 |
| [13 Test plan](13-test-plan.md) | Unit / integration / real KTV acceptance |
| [14 Roadmap](14-roadmap.md) | Milestones 與 TBD register |
| [ADR index](adr/README.md) | 7 份 Proposed ADR 與 template |
| [M0 Audio Evidence report](evidence/m0-audio-evidence.md) | 可重現合成測試、filter calculation、失效案例與 M1 contract 提案 |

先讀 [AGENTS.md](../AGENTS.md)。優先順序以該檔為準。舊 `.kiro` 完整保留；舊任務勾選完成不表示符合本版 FR。更新規格時保留 ID，新增需求用新 ID，移除需求標示 retired，不重複使用舊 ID。

本次初始化沒有實作 runtime FR，沒有新增套件、研究 clone 或 ChatGPT doc 橋服務。

後續 M0 Audio Evidence 已完成合成／計算證據與 deterministic replay；新增研究 harness，沒有修改 production。Browser/microphone/KTV 驗證仍未執行，不表示完整 M0 實境驗收完成。
