# Next.js 整合說明

這是套用 18 項優化建議後的檔案結構。複製進原專案即可，**不會覆蓋既有 shadcn/ui 元件**（`components/ui/*`、`lib/utils.ts`）。

## 檔案放置

```
app/
  (main)/                          ← 新增 route group
    layout.tsx                     ← 套 AppShell
    page.tsx                       ← Dashboard（取代原 app/page.tsx 內容）
    history/page.tsx               ← 歷史記錄
    episodes/[id]/page.tsx         ← 集數詳情
    new/page.tsx                   ← 新增任務
  globals.patch.css                ← 將內容合併進原 globals.css

components/
  podcast/
    app-shell.tsx                  ← 主框（mobile bottom-tab + desktop sidebar）
    dashboard.tsx
    history-list.tsx
    episode-card.tsx
    episode-detail.tsx
    upload-form.tsx
    status-pill.tsx
    cat-badge.tsx
    rich-text.tsx

lib/
  mock-data.ts                     ← 假資料層 + types
  utils.ts                         ← 若已存在則跳過
```

## 整合步驟

1. **複製檔案**：把 `nextjs/` 下對應路徑放進原專案。
2. **合併 CSS**：將 `app/globals.patch.css` 的 token 加入原 `app/globals.css` 的 `:root` 與 `.dark` 區塊。
3. **合併 Tailwind config**：把 `tailwind.config.patch.ts` 註解內的 `success / warning / info` 色加進原 `tailwind.config.ts` 的 `theme.extend.colors`。
4. **移除舊 `app/page.tsx`、`app/history/page.tsx` 等**：被 `(main)` route group 取代。
5. **shadcn 元件需求**：`button` / `input` / `label` / `select` — 都已是 shadcn 預設組件，原專案應已存在。
6. **串接真實資料**：`@/lib/mock-data` 的 export 名稱（`EPISODES`、`STATS`、`KEYPOINTS`、`WATCHLIST`）即未來 API 介面對應位置。改成 server component fetch，或在 page level 用 `getEpisodes()` 等 wrapper 替換即可。

## 18 項建議實作對應

| # | 建議 | 實作位置 |
|---|---|---|
| 桌機 1 | max-w 從 5xl 拉到 6xl | dashboard.tsx · history-list.tsx |
| 桌機 2 | 動態 H1 取代死標題 | dashboard.tsx |
| 桌機 3 | hero stat + 比例條 | dashboard.tsx |
| 桌機 4 | 活動時間軸（含 sentiment chip） | dashboard.tsx |
| 桌機 5 | 卡片 sentiment rail | episode-card.tsx |
| 桌機 6 | sticky search + segmented filter | history-list.tsx |
| 桌機 7 | tag 分主分類 / 標籤兩級 | episode-card.tsx |
| 桌機 8 | 處理中卡片給敘述 | episode-card.tsx + history-list.tsx |
| 桌機 9 | 報導式 lede + drop-cap + monospace mark | episode-detail.tsx · rich-text.tsx |
| 手機 1 | 抽屜 → 底部 tab bar + FAB | app-shell.tsx |
| 手機 2 | 動態 H1 | dashboard.tsx |
| 手機 3 | 2x2 stats → hero + 比例條 | dashboard.tsx |
| 手機 4 | sticky search header + segmented filter | history-list.tsx |
| 手機 5 | 卡片 sentiment rail | episode-card.tsx |
| 手機 6 | 處理中卡片進度敘述 | episode-card.tsx |
| 手機 7 | 詳情頁 sticky tab strip | episode-detail.tsx |
| 手機 8 | 複製/匯出固定底部動作列 | episode-detail.tsx |
| 手機 9 | 拖放敘述改「點選/從檔案 App」 | upload-form.tsx |
| 手機 10 | submit 按鈕釘底 | upload-form.tsx |

## 通用規範檢查

- 觸控區域：所有 icon button = `h-9 w-9` (36px) + 內 padding，主要動作 `h-11` (44px)
- 安全區：`pb-[max(env(safe-area-inset-bottom),12px)]` 套用於所有 fixed bottom 元素
- 水平捲動：`history` segmented filter 用 flex 換行（mobile）/ md:ml-auto（desktop）取代橫滑 sort 列
- 標題：`line-clamp-2` 取代 truncate（episode-card.tsx）

## 還沒做的（可後續再加）

- 行動建議 / Q&A / 金句 / 逐字稿 4 個 tab 內容（目前是 placeholder，需要實際資料 schema）
- swipe-to-action（mobile 卡片右滑「重試 / 刪除」）— Radix 沒原生，建議引 `framer-motion`
- 暗色模式微調（success / warning / info 在 dark mode 的對比度需實測）
- 串真 API：`mock-data.ts` 換成 `await fetch('/api/episodes')` 或對應 ORM query
