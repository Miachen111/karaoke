# 07 — Non-functional Requirements

數字目標除使用者已指定者外，不以猜測填入。TBD — requires measurement 不等於沒有驗收；先有量測方法，再核定門檻。

| ID | 類別與要求 | 驗證方式 / Acceptance Criteria |
|---|---|---|
| NFR-001 | Latency：回饋延遲可量測，無極端保證 | 記錄 capture→analysis→feedback 的 p50/p95、裝置與 sample rate；門檻 TBD — requires measurement；不能用 buffer 長度冒充 end-to-end latency |
| NFR-002 | Portability：不綁 KTV 業者或單一音訊設備 | 同一核心以 microphone/mock fixtures 跑通；其他 source 有 adapter contract；實際支援設備清單 TBD |
| NFR-003 | Browser support：明示支援矩陣與降級 | Windows 桌面瀏覽器先驗證，記錄版本；手機瀏覽器另實測；不支援 API 時顯示可理解錯誤而非 crash；正式支援版本 TBD |
| NFR-004 | Windows development：可由 Windows 本機開發 | README 可啟動現有 native ES-module PoC；不預設 Apple-only SDK 是核心必要依賴；未來 fingerprint tooling 的 Windows 可行性須 spike |
| NFR-005 | Privacy：以本機分析為優先 | 檢查音訊網路傳输；任何 provider 路徑記錄傳送 audio 或 fingerprint、目的、接收者與資料政策；第三方 consent UX TBD，未決定前不隱藏上傳 |
| NFR-006 | Data retention：預設不永久保留 raw audio | 不寫 raw audio 到 localStorage、IndexedDB、檔案、server 或 logs；stop/error 釋放暫存；buffer 上限與清理時限 TBD；第三方保留政策須另確認，不能承諾代第三方刪除 |
| NFR-007 | Reliability：生命週期可重入且無殘留 | 重複 start/stop、拒絕權限、中途失敗、device lost 後無殘留 active tracks；晚到回應不污染下個 session |
| NFR-008 | Graceful degradation：辨識與分析品質分別處理 | timeout/no-match/unavailable→unknown 仍可演唱；低 pitch confidence→unavailable metrics，不能假造成功 |
| NFR-009 | Maintainability：文件與實作可追溯 | 每次任務列出 FR IDs、測試、衝突；評分變更有 spec version；原生 ES modules 保留，遷移需解釋 |
| NFR-010 | Modularity：來源、分析、評分、遊戲與 UI 分離 | 靜態依賴檢查：scoring 無 vendor/network/DOM imports；pitch analyzer 無 UI；game 無 DSP；只在 adapter 取得 microphone |
| NFR-011 | Third-party dependency isolation | Vendor payload 只在 adapter；registry 有 license/version/maintenance/need；前端不嵌私人 API secret；需要服務端憑證時先提出 backend 決策 |
| NFR-012 | Testability：核心可獨立測試 | 用 synthetic PCM、mock source/provider、可控制 clock 驗證；mock 清楚標示；實境結果與測試 seed/version 可追溯 |

既有 Kiro design 的「<50ms」「<2ms」「60 FPS」是舊設計目標／推論，不是本版已證實效能。真實 KTV 混音是否可代表單一使用者聲音，需在 test plan 記錄失效情境。
