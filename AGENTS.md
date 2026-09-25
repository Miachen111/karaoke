# KTV Smart Scorer — AI Agent Project Rules

本檔是 repository 內所有 AI coding agent 的最高專案操作規範。新增文件不代表功能已實作。專案使用原生 JavaScript ES modules，不因 conceptual types 自動遷移 TypeScript 或框架。

## Source of Truth

1. Current explicit user instruction
2. AGENTS.md
3. Accepted ADR
4. [Functional requirements](docs/06-functional-requirements.md)
5. [Architecture](docs/08-system-architecture.md)
6. [Scoring specification](docs/10-scoring-specification.md)
7. Existing implementation
8. Experimental notes

Proposed ADR 不是 Accepted ADR；其中重述的使用者明確 constraints 仍有效。`.kiro/specs/ktv-smart-scorer/` 保留為舊 PoC 規格與開發歷史，不凌駕新需求。舊 Requirement 1–14 與新 FR 是不同命名空間。implementation 與 spec 衝突時指出衝突，不自行假定 code 正確，也不以文件更新為由自動重構。

## Project Rules

1. 修改架構或實作新功能前，閱讀 `/docs` 相關文件。
2. 不發明產品需求；缺少決策標記 `TBD`，不要默默選定行為。
3. 核心模組不得綁死 AcoustID、ShazamKit、AudD、ACRCloud、microphone API 或單一 ML library；使用 interfaces/adapters。
4. 修改評分公式必須同步更新 `docs/10-scoring-specification.md`，區分 experimental 與正式標準。
5. 引入第三方 dependency 前檢查 license、maintenance、project need，更新 `docs/12-open-source-references.md`；既有未審查項目不視為已核准。
6. GitHub public 不代表可複製。只有 license 允許預定用途才能 copy source；衍生或大幅改寫必須記錄來源與 attribution。
7. 一次處理一個 milestone / bounded task；未明確要求，不實作未來 roadmap 功能。
8. 不因偏好其他 framework / pattern 改寫可用架構；遷移前先說明提案與影響。
9. 所有 audio-processing components 應能獨立測試，不依賴真實 UI 或麥克風才能測核心邏輯。
10. Recognition providers 必須 graceful failure；辨識失敗不可讓評分應用無法使用。
11. AudioSource 與 SongRecognitionProvider 必須可替換。
12. 未明確要求，不永久儲存 raw user audio；預設 temporary / local / ephemeral。
13. 可行時優先 local processing；第三方音訊傳輸必須在設計中揭露資料內容與保留政策。
14. business logic 與 presentation/UI 分離；Pitch Analyzer 不操作 UI，Game Engine 不做 DSP。
15. 未經 validated testing，不宣稱專業唱歌準確度、氣息／情感／真假音診斷或原唱相似度。
16. 所有 experimental scoring metrics 必須明示 experimental；沒有 reference 時不能宣稱旋律正確率。
17. 完成 coding task 時列出修改檔案、實作 requirement IDs、執行測試、剩餘失敗、spec conflicts；不得用 mock success 掩蓋未完成實作。未執行測試須明說。

## Codex Task Workflow

1. Read AGENTS.md.
2. Read related requirement docs.
3. Read architecture.
4. Read related ADR.
5. Inspect current implementation.
6. Restate bounded implementation task，列出範圍與 FR IDs。
7. Implement.
8. Test，依修改範圍選擇有意義的驗證。
9. Report，包含 Rule 17 的六項資訊。

只改文件時報告「無 runtime FR 實作」，驗證文件完整性、交叉引用與 source preservation；不要宣稱通過未執行的瀏覽器或 KTV 測試。

## GitHub Reference Workflow

收到 GitHub URL 不代表授權搬入整個 repository。先 inspect LICENSE，再只讀相關 source，辨識需要的 algorithm / pattern，更新 reference registry，決定 dependency / adapt code / reimplement concept / reject，最後才修改 production code。

記錄 repository URL、project、maintainer/organization、last meaningful update、license 與檢查版本、purpose、usage type、attribution、copyleft、公開 GitHub 適用性。優先評估 MIT / Apache-2.0 / BSD；GPL / LGPL / AGPL 先標風險再決策。無明確 license 不 copy source，也不直接衍生 implementation；可讀概念但須另找允許的來源。

## Reference Folder Policy

若有需要才建立 `references/` 作暫時研究 clone，記錄來源與 revision。它不是 production source，不得自動 import；正式 dependency 使用 package manager 或明確整合流程。不得意外提交整個研究 clone；commit 前檢查檔案清單與授權。本次不建立研究 clone。

## Scope Guardrails

產品是外掛 KTV 的娛樂型 performance scoring：Any KTV. Any Song. Just Sing. 不自建歌曲庫，不要求在本系統選歌。DSP、開源 libraries、pretrained models、rule-based scoring 優先；AI enhancement 不是 prerequisite，初期不自建大型 training dataset 或從零訓練 neural network。不未授權擷取或重散布串流音樂，不提供歌曲下載。

從 [docs index](docs/README.md) 開始；衝突在 [architecture](docs/08-system-architecture.md)，缺少決策在 [roadmap](docs/14-roadmap.md)。
