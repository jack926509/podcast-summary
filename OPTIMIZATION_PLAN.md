# Podcast 摘要系統 — 優化計畫

基於前端工程師、後端工程師、使用者三大視角的專家評審結果，將所有改善項目整合為
**4 個階段、12 個步驟**的實施計畫，由高優先到低優先依序執行。

---

## Phase 1：安全與穩定性修復（P0 — 立即修復）

### Step 1：遠端下載防護 — SSRF 與大小限制

**檔案：** `lib/services/pipeline.ts`

1. 新增 `isUrlSafe(url)` 函式：解析 URL 後拒絕 `localhost`、`127.0.0.1`、
   `10.x`、`172.16-31.x`、`192.168.x` 等內網 IP
2. 在 `downloadRemoteFile()` 開頭呼叫 `isUrlSafe()` 檢查
3. 加入 `Content-Length` 檢查，超過 `MAX_DOWNLOAD_BYTES`（如 500MB）即拒絕
4. 將 `response.arrayBuffer()` 改為串流寫入（`Readable.fromWeb` + `pipeline`），
   寫入過程中計數 bytes 並在超限時中斷

**驗收：** URL 為內網位址或檔案過大時，episode 狀態正確轉為 error 並顯示明確訊息。

### Step 2：Whisper API 重試機制

**檔案：** `lib/services/transcription.ts`

1. 新增 `callWhisperWithRetry(file, retries=3)` 函式，仿照 `summarization.ts`
   的 `callClaude()` 做 3 次指數退避（2s, 4s, 8s）
2. 將現有的 `openai.audio.transcriptions.create()` 呼叫包裝進此函式
3. 在 chunk loop 中使用 `callWhisperWithRetry()`

**驗收：** 模擬單次 Whisper API 超時後自動重試，最終成功完成轉錄。

### Step 3：前端安全性與錯誤處理

**檔案：** `next.config.js`、`components/episodes/episode-table.tsx`、`app/history/page.tsx`

1. **`next.config.js`**：將 `remotePatterns` 的 `hostname: '**'` 收窄，
   改為 `hostname: '*'`（單層通配）或列出常見 Podcast CDN 白名單
2. **`episode-table.tsx`**：DELETE fetch 加入 try-catch + response 檢查，
   失敗時 toast 提示「刪除失敗」
3. **`history/page.tsx`**：`<Suspense>` 加入 `fallback` prop，渲染 5 行 Skeleton

---

## Phase 2：可靠性與使用者體驗改善（P1 — 短期改善）

### Step 4：崩潰後任務恢復

**檔案：** 新增 `lib/services/recovery.ts`、修改 `Dockerfile`

1. 新增 `recoverStaleEpisodes()` 函式：查詢所有 `transcribing` 或 `summarizing`
   狀態的 episode，將其重設為 `pending`，並重新呼叫 `processEpisode()`
2. 修改 Dockerfile `CMD`：
   ```dockerfile
   CMD ["sh", "-c", "npx prisma db push && node -e \"require('./lib/services/recovery').recoverStaleEpisodes()\" && npm start"]
   ```
   或在 Next.js `instrumentation.ts` 中呼叫（App Router 支援）
3. 同時將 `prisma db push` 改為 `prisma migrate deploy`（若已建立 migrations）

**驗收：** 容器重啟後，卡住的 episode 自動恢復處理。

### Step 5：中文文本分段策略

**檔案：** `lib/services/summarization.ts`、`lib/constants.ts`

1. 在 `constants.ts` 新增 `TRANSCRIPT_CHUNK_CHARS = 6000`（字元數閾值）
2. 修改 `summarizeTranscript()` 的判斷邏輯：
   - 若 `transcript.length > TRANSCRIPT_CHUNK_CHARS * 2` 則啟用 map-reduce
   - 以字元數而非 word count 切分（中文無空白分詞問題）
3. 修改 `chunkTranscript()` 改為按字元數切分，並在句號（。）或換行處斷開，
   避免切在句子中間

**驗收：** 純中文逐字稿能正確觸發 map-reduce 並在句號處斷開。

### Step 6：錯誤重試按鈕

**檔案：** `components/episodes/episode-detail.tsx`、新增 `app/api/episodes/[id]/retry/route.ts`

1. 新增 API Route `POST /api/episodes/[id]/retry`：
   - 驗證 episode 狀態為 `error`
   - 重設狀態為 `pending`，清空 `errorMsg`
   - 呼叫 `processEpisode(id).catch(console.error)`（fire-and-forget）
   - 回傳 202
2. 在 `episode-detail.tsx` 的 Error 區塊加入「重新處理」按鈕，
   點擊後 POST 到 retry API，成功後 toast 提示「已重新排入處理佇列」

**驗收：** 失敗的 episode 可一鍵重試，狀態正確轉回 pending 並重新處理。

### Step 7：智慧輪詢策略

**檔案：** `components/episodes/episode-table.tsx`、`hooks/use-episode-polling.ts`

1. **`episode-table.tsx`**：SWR `refreshInterval` 改為條件式：
   ```tsx
   const hasProcessing = data?.items?.some(ep =>
     PROCESSING_STATUSES.includes(ep.status)
   );
   { refreshInterval: hasProcessing ? 5000 : 0 }
   ```
   沒有處理中 episode 時停止輪詢
2. **`use-episode-polling.ts`**：修正 ESLint disable，
   明確列出 `[episode.id, shouldPoll]` 並加上解釋註解

**驗收：** 全部 episode 為 done/error 時，SWR 不再自動發請求（Network tab 驗證）。

---

## Phase 3：功能增強（P2 — 中期優化）

### Step 8：全文搜尋

**檔案：** `app/api/episodes/route.ts`、`components/episodes/episode-table.tsx`

1. API GET 增加 `search` query 參數，用 PostgreSQL `ILIKE` 搜尋：
   ```ts
   where: {
     OR: [
       { title: { contains: search, mode: 'insensitive' } },
       { summary: { overview: { contains: search, mode: 'insensitive' } } },
     ]
   }
   ```
2. `episode-table.tsx` 篩選區加入搜尋輸入框，debounce 300ms 後更新 URL
   search param `?q=keyword`，觸發 SWR 重新取資料

**驗收：** 在歷史頁搜尋關鍵字，可篩選出 title 或 overview 包含該字的 episode。

### Step 9：Markdown 匯出

**檔案：** `components/episodes/episode-detail.tsx`

1. 新增 `generateMarkdown(episode, summary)` 函式，組合：
   ```markdown
   # {title}
   > {podcast.title} | {publishedAt}
   ## 整體摘要
   {overview}
   ## 重點整理
   1. {keyPoint1}
   ...
   ## 金句精選
   > {quote1}
   ...
   ## 標籤
   {tags}
   ```
2. 在 episode-detail 的 summary 區塊下方加「匯出 Markdown」按鈕，
   使用 Blob + URL.createObjectURL 觸發 `.md` 檔案下載

**驗收：** 點擊後瀏覽器下載 `.md` 檔，格式正確可在任何 Markdown 編輯器開啟。

### Step 10：表格排序

**檔案：** `app/api/episodes/route.ts`、`components/episodes/episode-table.tsx`

1. API GET 增加 `sortBy`（title/createdAt/status）與 `sortOrder`（asc/desc）
   query 參數，預設 `createdAt desc`
2. `episode-table.tsx` 表頭加排序箭頭按鈕，點擊切換排序方向，
   更新 URL search params `?sortBy=createdAt&sortOrder=desc`

**驗收：** 點擊表頭可切換排序，URL 保留排序狀態可分享。

---

## Phase 4：架構優化（P3 — 長期規劃）

### Step 11：Error Boundary 與全域錯誤處理

**檔案：** 新增 `app/error.tsx`、`app/history/error.tsx`

1. 新增 `app/error.tsx`（根層級 Error Boundary）：
   顯示友善錯誤頁面，包含「重新載入」按鈕
2. 新增 `app/history/error.tsx`：歷史頁專用錯誤頁面
3. 確保資料庫查詢失敗不會導致白屏

**驗收：** 資料庫斷線時顯示錯誤頁面而非白屏。

### Step 12：同步 fs 改為非同步

**檔案：** `lib/services/pipeline.ts`、`lib/services/transcription.ts`、
`app/api/episodes/upload/route.ts`、`app/api/episodes/[id]/route.ts`

1. 將所有 `fs.writeFileSync` → `fs.promises.writeFile`
2. 將所有 `fs.unlinkSync` → `fs.promises.unlink`
3. 將所有 `fs.existsSync` → `fs.promises.access` with try-catch
4. 將 `fs.readdirSync` → `fs.promises.readdir`

**驗收：** 全域搜尋 `Sync` 無檔案系統同步呼叫殘留，`npm run build` 通過。

---

## 實施時間軸

```
Phase 1 (Step 1-3)  ── 安全穩定 ──  最優先，所有後續依賴此基礎
Phase 2 (Step 4-7)  ── 可靠體驗 ──  提升日常使用品質
Phase 3 (Step 8-10) ── 功能增強 ──  提升長期使用價值
Phase 4 (Step 11-12)── 架構優化 ──  程式碼品質與可維護性
```

每個 Step 完成後執行 `npm run build` 驗證，全部完成後統一 commit + push。
