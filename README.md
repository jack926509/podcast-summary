# 🎙️ Podcast 摘要系統

個人 Podcast 內容摘要與知識管理系統 — 上傳音檔或訂閱 RSS Feed，自動產生逐字稿、財經分類摘要、重點與金句，並可全文搜尋所有內容。

---

## 核心強項

### 財經知識類 AI 摘要，精準分類重點
透過 **Anthropic Claude Sonnet** 對逐字稿進行深度分析，自動標注以下語意分類標籤：

`【市場觀點】` `【投資策略】` `【數據】` `【趨勢】` `【風險提示】` `【概念解析】` `【產業動態】` `【操作建議】`

每集輸出：**整體摘要 + 分類重點條列 + 金句精選 + 主題標籤**

### 智慧成本控制，品質與費用兼顧
- 短逐字稿（< 6,000 字）→ **Sonnet 直接輸出**，品質最高
- 長逐字稿（超過上限）→ **Haiku 分段預處理 + Sonnet 最終整合**
- 相比全程 Sonnet，長集數成本節省約 **60–80%**，摘要品質不降

### 大型音檔全自動處理
- 超過 25 MB（Whisper 限制）時，**ffmpeg 自動分段**再依序轉錄後合併
- 每段設有 **10 分鐘 AbortController 超時保護**，不讓任務永久懸空
- 支援 MP3 / WAV / M4A / OGG，最大上傳 500 MB

### 全文搜尋 + 標籤系統
- 單一搜尋框同時覆蓋：**標題、逐字稿、AI 摘要、重點條列**
- 每集標籤可點擊，跨頁互通（歷史頁 ↔ 詳情頁）
- 篩選條件（搜尋字、狀態、標籤、排序）**持久化於 URL**，分享或重整不失效

### Podcast 訂閱管理
- 貼入 RSS Feed URL 或 **Apple Podcasts 網址**（自動透過 iTunes API 解析）
- 訂閱後可一鍵「檢查新集數」，勾選後加入處理佇列
- 批次處理最多 20 集，**100ms 錯開觸發**，避免 API 速率限制

### 穩定性設計
| 機制 | 說明 |
|------|------|
| 並行限制 | 同時最多處理 2 集（Semaphore），防止記憶體溢出 |
| 崩潰恢復 | 重啟時自動偵測「轉錄中 / 摘要中」卡住集數並重新排入佇列 |
| 智慧重試 | 逐字稿已存在時**跳過 Whisper 步驟**，直接重跑摘要 |
| 暫存清理 | 啟動時自動刪除 `/tmp` 下超過 1 小時的殘留音檔 |
| SSRF 防護 | 下載遠端音檔前驗證 URL，阻擋內網 / localhost 請求 |

---

## 功能總覽

- **音檔上傳**：拖放即上傳，前端即時顯示大小限制與上傳進度
- **RSS / Apple Podcasts**：貼入任意格式 URL，自動解析集數列表
- **Podcast 訂閱**：管理訂閱清單，定期檢查新集數
- **語音轉文字**：OpenAI Whisper，大檔自動分段，保留完整逐字稿
- **AI 摘要**：財經分類重點 + 金句 + 主題標籤
- **全文搜尋**：搜尋所有歷史集數內容
- **複製 / 匯出**：一鍵複製全文摘要，或匯出 Markdown 檔案
- **手機響應式**：側欄抽屜式設計，行動裝置完整可用
- **即時狀態更新**：處理中每 5 秒自動輪詢，完成後停止輪詢

---

## 技術堆疊

| 類別 | 技術 |
|------|------|
| 框架 | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| 資料庫 | SQLite + Prisma ORM |
| 語音轉文字 | OpenAI Whisper API |
| AI 摘要 | Anthropic Claude Sonnet 4.5 / Haiku 4.5 |
| 音訊處理 | ffmpeg（`@ffmpeg-installer/ffmpeg`，免手動安裝） |
| 部署 | Zeabur（Node.js standalone output） |

---

## 快速開始

### 前置需求

- Node.js 20+
- OpenAI API Key
- Anthropic API Key

> ffmpeg 透過 `@ffmpeg-installer/ffmpeg` 自動安裝，不需手動設定。

### 安裝

```bash
git clone https://github.com/your-username/podcast-summarizer.git
cd podcast-summarizer
npm install
```

### 環境變數

```bash
cp .env.example .env
```

```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

### 初始化資料庫

```bash
npx prisma db push
```

### 啟動開發伺服器

```bash
npm run dev
```

開啟 http://localhost:3000

---

## 部署到 Zeabur

### 1. 推送到 GitHub

```bash
git add .
git commit -m "init"
git push origin main
```

### 2. Zeabur 設定

1. 登入 [Zeabur](https://zeabur.com) → 建立專案 → 從 GitHub 匯入
2. 設定環境變數：

   | 變數 | 值 |
   |------|----|
   | `DATABASE_URL` | `file:/var/data/prod.db` |
   | `OPENAI_API_KEY` | 你的 Key |
   | `ANTHROPIC_API_KEY` | 你的 Key |

3. 新增 Persistent Volume，掛載路徑 `/var/data`（建議 1 GB 以上）

### 3. Build 指令

```
Build:  npx prisma generate && npx prisma db push && npm run build
Start:  npm start
```

---

## 專案結構

```
app/
  api/            → API Routes（episodes、podcasts、feeds、upload）
  history/        → 歷史記錄頁
  subscriptions/  → 訂閱管理頁
components/
  episodes/       → EpisodeTable、EpisodeDetail、UploadForm
  dashboard/      → StatsCards、RecentTasks
  layout/         → AppShell（含手機側欄）、Sidebar
  ui/             → shadcn/ui 元件
hooks/            → useEpisodePolling、useToast
lib/
  services/       → pipeline、transcription、summarization、recovery
  concurrency.ts  → Semaphore（並行限制）
  startup.ts      → 崩潰恢復 + 暫存清理
  constants.ts    → 全域常數
prisma/
  schema.prisma   → Podcast、Episode、Summary 資料模型
```

---

## License

MIT
