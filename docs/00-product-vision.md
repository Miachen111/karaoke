# 00 — Product Vision

## Product Vision

KTV Smart Scorer 是外掛式 KTV 即時評分與 Party Game 系統。核心概念：「現有 KTV 播什麼，我們就分析什麼。」

**Any KTV. Any Song. Just Sing.**

「不用換 KTV、不用重新點歌，打開系統就能評分。」這是目標定位，不是對所有歌曲、裝置與包廂的辨識成功保證。

## 使用情境

使用者到 KTV，原系統照常播歌；開啟本系統並允許 microphone，嘗試辨識當前歌曲。辨識成功取得可用 metadata；失敗仍進入 Unknown Song Mode。演唱時分析音訊、呈現娛樂回饋，結束後看結果。未來多人排行榜與 Party Game 加強聚會互動。

## Value Proposition

在缺少即時互動的 KTV 場景補上可攜帶、低設定成本的唱歌遊戲體驗。歌曲辨識不應成為唱歌與評分的入口門檻；不要求使用者重新點歌。

## 差異化方向

1. 外掛現有 KTV，不自建 Karaoke ecosystem。
2. Zero / low setup 是方向；麥克風授權與裝置限制仍須處理。
3. 嘗試自動 song recognition。
4. 辨識失敗仍能工作。
5. 即時娛樂型 performance scoring。
6. Party Game / gamification；多人屬後續 milestone。
7. 保留未來 KTV mixer、line-in、USB audio interface 等硬體輸入。

## 產品不是什麼

不是另一個全民 K 歌或 StarMaker，不經營完整歌曲庫，不以站內選歌為必要條件。不是第一版 AI 聲樂老師，不宣稱專業氣息、情感、真假音、原唱還原或缺乏 reference 的相似度。不是歌曲下載或串流再散布平台。

以 live microphone 為主，原始音訊原則上不永久儲存。AI 是 enhancement，不是 prerequisite；現場混音能否可靠代表主唱須實測。
