# Podcast 內容摘要與記錄系統 — 完整建置指南

> 最後更新：2026-04-07

---

## 目錄

1. [系統架構總覽](#1-系統架構總覽)
2. [技術堆疊](#2-技術堆疊)
3. [逐步建置 Prompt 清單](#3-逐步建置-prompt-清單)
4. [資料庫 Schema](#4-資料庫-schema)
5. [資料流說明](#5-資料流說明)
6. [大檔案分段策略](#6-大檔案分段策略)
7. [環境變數清單](#7-環境變數清單)
8. [Zeabur 部署設定](#8-zeabur-部署設定)
9. [專案目錄結構](#9-專案目錄結構)

---

## 1. 系統架構總覽

```
┌──────────────────────────────────────────────────┐
│                    Frontend                       │
│         Next.js App Router + shadcn/ui            │
│                                                   │
│  ┌────────────┐ ┌────────────┐ ┌───────────────┐ │
│  │ Dashboard  │ │ 新增任務   │ │ 歷史記錄檢視  │ │
│  └─────┬──────┘ └─────┬──────┘ └───────┬───────┘ │
│        │              │               │           │
└────────┼──────────────┼───────────────┼───────────┘
         │              │               │
         ▼              ▼               ▼
┌──────────────────────────────────────────────────┐
│                 API Routes                        │
│                                                   │
│  POST /api/episodes          建立任務 (回 202)    │
│  POST /api/episodes/upload   上傳音檔             │
│  POST /api/feeds             解析 RSS Feed        │
│  GET  /api/episodes          列表 (分頁+篩選)     │
│  GET  /api/episodes/[id]     單集詳情 (含輪詢)    │
│  DELETE /api/episodes/[id]   刪除                 │
│                                                   │
└──────────────┬───────────────────┬────────────────┘
               │                   │
    ┌──────────▼──────┐  ┌────────▼─────────┐
    │  OpenAI Whisper │  │  Anthropic Claude │
    │  語音轉文字      │  │  摘要 / 金句提取  │
    └──────────┬──────┘  └────────┬─────────┘
               │                   │
               ▼                   ▼
        ┌─────────────────────────────────┐
        │     SQLite (via Prisma ORM)     │
        │                                 │
        │  Podcast → Episode → Summary    │
        └─────────────────────────────────┘
```

---

## 2. 技術堆疊

| 類別         | 技術                         | 用途                     |
| ------------ | ---------------------------- | ------------------------ |
| 框架         | Next.js 14+ (App Router)     | 前後端整合               |
| 語言         | TypeScript                   | 型別安全                 |
| UI           | Tailwind CSS + shadcn/ui     | 元件庫與樣式             |
| 資料庫       | SQLite                       | 輕量持久化               |
| ORM          | Prisma                       | 資料庫操作               |
| 語音轉文字   | OpenAI Whisper API           | 音檔轉逐字稿             |
| AI 摘要      | Anthropic Claude API         | 摘要、重點、金句         |
| 音訊處理     | fluent-ffmpeg + ffmpeg       | 大檔分段切割             |
| RSS 解析     | rss-parser                   | 解析 Podcast Feed        |
| 部署         | Zeabur                       | 雲端託管                 |

---

## 3. 逐步建置 Prompt 清單

以下是建議依序向 AI 提出的 Prompt，每一步產出可執行的程式碼區塊。

### Step 1 — 專案初始化

```
請幫我初始化 Next.js 專案：
- 使用 App Router + TypeScript
- 安裝 Tailwind CSS 並設定
- 安裝 shadcn/ui 並初始化 (含 button, card, input, badge, dialog, table, toast 元件)
- 安裝 Prisma 並設定 SQLite，DATABASE_URL 使用 file:./dev.db
- 建立 .env.example 包含所有環境變數佔位
- 提供完整的 package.json 與安裝指令
```

### Step 2 — 資料庫 Schema 與 Migrate

```
請根據以下需求建立 prisma/schema.prisma 並產生 migration：
- Podcast 表：id, title, author, feedUrl(unique), description, imageUrl, createdAt
- Episode 表：id, podcastId(FK), title, audioUrl, duration, publishedAt, status(pending/transcribing/summarizing/done/error), errorMsg, transcript, createdAt, updatedAt
- Summary 表：id, episodeId(1:1), overview, keyPoints(JSON string), quotes(JSON string), tags(JSON string), createdAt
- 提供 prisma db push 指令與 seed 範例
```

### Step 3 — Prisma Client 與工具函式

```
請建立：
1. lib/prisma.ts — 單例 Prisma Client (避免 dev 環境重複連線)
2. lib/types.ts — 前後端共用的 TypeScript 型別
3. lib/constants.ts — 狀態常數 (EPISODE_STATUS enum)
提供完整程式碼。
```

### Step 4 — RSS Feed 解析 API

```
請建立 POST /api/feeds API Route：
- 接收 { feedUrl: string }
- 使用 rss-parser 解析 Feed
- 自動建立 Podcast 記錄 (若不存在)
- 回傳解析出的集數列表 (不自動建立 Episode，讓前端選擇)
- 包含錯誤處理與驗證
```

### Step 5 — 音檔上傳 API

```
請建立 POST /api/episodes/upload API Route：
- 使用 Next.js App Router 的 Request 物件處理 multipart/form-data
- 接收音檔 (mp3/wav，限 500MB)
- 暫存到 /tmp 目錄
- 建立 Episode 記錄 (status: pending)
- 回傳 202 + episodeId
- 暫存檔處理完成後刪除
```

### Step 6 — Whisper 轉錄服務

```
請建立 lib/services/transcription.ts：
- 函式 transcribeAudio(filePath: string): Promise<string>
- 檢查檔案大小，若超過 25MB 則用 ffmpeg 切成多段
- 逐段呼叫 OpenAI Whisper API (/v1/audio/transcriptions)
- 拼接所有段落的文字
- 失敗時拋出有意義的錯誤
- 處理完成後清理暫存分段檔案
```

### Step 7 — Claude 摘要服務

```
請建立 lib/services/summarization.ts：
- 函式 summarizeTranscript(transcript: string): Promise<SummaryResult>
- 使用 Anthropic SDK 呼叫 Claude API
- System Prompt 要求輸出 JSON：{ overview, keyPoints[], quotes[], tags[] }
- 若逐字稿太長，先切段摘要再合併 (map-reduce 策略)
- 包含 JSON 解析容錯與 retry 邏輯
```

### Step 8 — 背景任務處理管線

```
請建立 lib/services/pipeline.ts：
- 函式 processEpisode(episodeId: string): Promise<void>
- 流程：更新 status → transcribing → 呼叫 Whisper → 存 transcript
         → 更新 status → summarizing → 呼叫 Claude → 存 Summary
         → 更新 status → done
- 任何一步失敗：status → error，寫入 errorMsg
- 此函式以 fire-and-forget 方式在 API Route 中呼叫 (不 await)
```

### Step 9 — Episode CRUD API Routes

```
請建立以下 API Routes：
1. GET /api/episodes — 列表，支援 ?status=&page=&limit= 篩選分頁
2. GET /api/episodes/[id] — 單集詳情 (含 podcast 與 summary 關聯)
3. DELETE /api/episodes/[id] — 刪除 episode 及關聯 summary
所有 Route 使用 Prisma 操作，包含錯誤處理。
```

### Step 10 — 前端：Layout 與 Dashboard

```
請建立前端頁面：
1. app/layout.tsx — 全域 Layout，含側邊導覽列 (Dashboard / 新增 / 歷史)
2. app/page.tsx — Dashboard 首頁
   - 顯示統計卡片：總集數、處理中、已完成、失敗
   - 最近 5 筆任務狀態列表
   - 使用 shadcn/ui Card + Badge 元件
   - 使用 SWR 或 fetch 取得資料
```

### Step 11 — 前端：新增任務頁面

```
請建立 app/new/page.tsx — 新增任務頁面：
- Tab 切換：「上傳音檔」/「RSS Feed」
- 上傳音檔 Tab：拖放區域 + 標題輸入 → 呼叫 /api/episodes/upload
- RSS Feed Tab：輸入 Feed URL → 呼叫 /api/feeds → 顯示集數列表
  → 勾選想處理的集數 → 批次建立 Episode
- 提交後導向 Dashboard 並顯示 toast 通知
- 使用 shadcn/ui Tabs, Input, Button, Toast
```

### Step 12 — 前端：歷史記錄與詳情頁

```
請建立：
1. app/history/page.tsx — 歷史記錄列表
   - 表格顯示：標題、節目名稱、狀態 Badge、建立時間
   - 狀態篩選 Dropdown
   - 點擊列展開或導航至詳情
   
2. app/history/[id]/page.tsx — 單集詳情頁
   - 摘要區塊：overview 全文
   - 分段重點：keyPoints 列表
   - 金句：quotes 卡片
   - 逐字稿：可收合的全文區域
   - 處理中狀態：顯示進度提示 + 自動輪詢 (3 秒)
```

### Step 13 — 輪詢與狀態更新

```
請建立 hooks/useEpisodePolling.ts：
- 自訂 Hook，當 episode.status 為 pending/transcribing/summarizing 時
  每 3 秒 GET /api/episodes/[id] 取得最新狀態
- 狀態變為 done 或 error 時停止輪詢
- 提供 { episode, isLoading, error } 回傳值
```

### Step 14 — 部署準備

```
請幫我準備 Zeabur 部署所需的設定：
1. 確認 next.config.js 的 output 設定
2. 建立 .env.example 列出所有必要環境變數
3. 確認 prisma 在 build 時自動 generate
4. 確認 SQLite 檔案路徑適合 Zeabur 的持久化儲存
5. 提供 Dockerfile (如需要)
6. 撰寫部署步驟說明
```

---

## 4. 資料庫 Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Podcast {
  id          String    @id @default(cuid())
  title       String
  author      String?
  feedUrl     String?   @unique
  description String?
  imageUrl    String?
  createdAt   DateTime  @default(now())
  episodes    Episode[]
}

model Episode {
  id          String   @id @default(cuid())
  podcastId   String
  podcast     Podcast  @relation(fields: [podcastId], references: [id], onDelete: Cascade)
  title       String
  audioUrl    String?
  duration    Int?
  publishedAt DateTime?
  status      String   @default("pending")
  errorMsg    String?
  transcript  String?
  summary     Summary?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([podcastId])
  @@index([status])
}

model Summary {
  id        String   @id @default(cuid())
  episodeId String   @unique
  episode   Episode  @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  overview  String
  keyPoints String   // JSON array string
  quotes    String   // JSON array string
  tags      String?  // JSON array string
  createdAt DateTime @default(now())
}
```

---

## 5. 資料流說明

### 流程 A：上傳音檔

```
使用者上傳 mp3/wav
  → POST /api/episodes/upload (multipart/form-data)
  → 暫存至 /tmp
  → 建立 Episode (status: pending)
  → 回傳 202 { episodeId }
  → 背景觸發 pipeline.processEpisode(episodeId)
      ├─ status → transcribing
      ├─ 檢查檔案大小 > 25MB？
      │    ├─ 是 → ffmpeg 切段 → 逐段 Whisper API → 拼接
      │    └─ 否 → 直接 Whisper API
      ├─ 寫入 transcript → status → summarizing
      ├─ Claude API 生成摘要
      ├─ 寫入 Summary → status → done
      └─ 失敗時 → status → error, 寫入 errorMsg
  → 前端每 3 秒輪詢 GET /api/episodes/[id] 直到 done/error
```

### 流程 B：RSS Feed

```
使用者輸入 Feed URL
  → POST /api/feeds
  → rss-parser 解析 → 建立/更新 Podcast 記錄
  → 回傳集數列表 (不自動建立 Episode)
  → 使用者勾選要處理的集數
  → POST /api/episodes (批次建立)
  → 對每一集：下載音檔至 /tmp → 同流程 A 的背景處理
```

---

## 6. 大檔案分段策略

```
原始音檔 (例如 180MB, 2 小時)
  │
  ▼
ffmpeg -i input.mp3 -f segment -segment_time 600 -c copy /tmp/chunk_%03d.mp3
  │
  ├─ chunk_000.mp3 (≤25MB)  → Whisper API → text_0
  ├─ chunk_001.mp3 (≤25MB)  → Whisper API → text_1
  ├─ chunk_002.mp3 (≤25MB)  → Whisper API → text_2
  └─ ...
  │
  ▼
transcript = [text_0, text_1, text_2, ...].join("\n")
  │
  ▼
刪除所有 chunk 暫存檔
```

注意事項：
- `segment_time` 預設 600 秒 (10 分鐘)，可依實際大小調整
- Whisper API 單檔上限 25MB
- 使用 `fluent-ffmpeg` npm 套件操作
- Zeabur 環境需確認 ffmpeg 可用 (可在 Dockerfile 中安裝)

---

## 7. 環境變數清單

```env
# ===== 資料庫 =====
DATABASE_URL="file:./prod.db"

# ===== OpenAI (Whisper 轉錄) =====
OPENAI_API_KEY="sk-..."

# ===== Anthropic (Claude 摘要) =====
ANTHROPIC_API_KEY="sk-ant-..."

# ===== 應用設定 =====
NEXT_PUBLIC_APP_URL="https://your-app.zeabur.app"

# ===== 檔案上傳限制 (bytes) =====
MAX_UPLOAD_SIZE="524288000"
```

| 變數名稱              | 必填 | 說明                                   | 取得方式                          |
| --------------------- | ---- | -------------------------------------- | --------------------------------- |
| `DATABASE_URL`        | ✅   | SQLite 檔案路徑                        | 固定值，Zeabur 需指向持久化路徑   |
| `OPENAI_API_KEY`      | ✅   | OpenAI API 金鑰                        | https://platform.openai.com       |
| `ANTHROPIC_API_KEY`   | ✅   | Anthropic API 金鑰                     | https://console.anthropic.com     |
| `NEXT_PUBLIC_APP_URL` | ❌   | 應用公開 URL，用於 metadata            | 部署後取得                        |
| `MAX_UPLOAD_SIZE`     | ❌   | 上傳檔案大小限制，預設 500MB           | 自行設定                          |

---

## 8. Zeabur 部署設定

### 8.1 前置準備

1. 程式碼上傳至 GitHub Repository
2. 註冊 Zeabur 帳號並連結 GitHub
3. 準備好 OpenAI 與 Anthropic 的 API Key

### 8.2 Zeabur 專案建立流程

1. 登入 Zeabur → 建立新專案 (Create Project)
2. 選擇 Region（建議 `ap-east` 亞太東部）
3. 新增服務 (Add Service) → 選擇「Git」→ 選擇你的 Repo
4. Zeabur 會自動偵測 Next.js 並設定建置指令

### 8.3 環境變數設定

在 Zeabur Dashboard → 服務 → Variables 分頁中，新增以下變數：

```
DATABASE_URL           = file:/var/data/prod.db
OPENAI_API_KEY         = sk-...
ANTHROPIC_API_KEY      = sk-ant-...
```

### 8.4 持久化儲存 (Persistent Storage)

SQLite 需要持久化磁碟，否則重新部署時資料會遺失：

1. 在服務設定中找到「Disk」或「Volume」區塊
2. 新增 Volume：掛載路徑 `/var/data`，容量 1GB
3. 確認 `DATABASE_URL` 指向 `file:/var/data/prod.db`

### 8.5 Build 設定

Zeabur 通常會自動偵測，若需手動設定：

```
Build Command:  npx prisma generate && npx prisma db push && npm run build
Start Command:  npm start
```

### 8.6 Dockerfile（備用方案）

若 Zeabur 自動偵測不含 ffmpeg，需使用自訂 Dockerfile：

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y ffmpeg openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npm start"]
```

### 8.7 部署後驗證清單

- [ ] 首頁 Dashboard 可正常載入
- [ ] 上傳小音檔 (< 1MB) 可完成轉錄與摘要
- [ ] RSS Feed 輸入可解析集數
- [ ] 歷史記錄頁可查看過去任務
- [ ] 重新部署後 SQLite 資料仍存在（持久化驗證）

---

## 9. 專案目錄結構

```
podcast-summarizer/
├── app/
│   ├── layout.tsx                 # 全域 Layout + 側邊導覽
│   ├── page.tsx                   # Dashboard 首頁
│   ├── new/
│   │   └── page.tsx               # 新增任務 (上傳/RSS)
│   ├── history/
│   │   ├── page.tsx               # 歷史記錄列表
│   │   └── [id]/
│   │       └── page.tsx           # 單集詳情頁
│   ├── api/
│   │   ├── feeds/
│   │   │   └── route.ts           # RSS Feed 解析
│   │   └── episodes/
│   │       ├── route.ts           # GET 列表 / POST 建立
│   │       ├── upload/
│   │       │   └── route.ts       # 音檔上傳
│   │       └── [id]/
│   │           └── route.ts       # GET 詳情 / DELETE
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn/ui 元件
│   ├── layout/
│   │   └── sidebar.tsx            # 側邊導覽列
│   ├── dashboard/
│   │   ├── stats-cards.tsx        # 統計卡片
│   │   └── recent-tasks.tsx       # 最近任務列表
│   ├── episodes/
│   │   ├── upload-form.tsx        # 上傳表單
│   │   ├── feed-form.tsx          # RSS 表單
│   │   ├── episode-table.tsx      # 歷史列表表格
│   │   └── episode-detail.tsx     # 詳情內容
│   └── shared/
│       └── status-badge.tsx       # 狀態標籤元件
├── hooks/
│   └── use-episode-polling.ts     # 狀態輪詢 Hook
├── lib/
│   ├── prisma.ts                  # Prisma Client 單例
│   ├── types.ts                   # 共用型別
│   ├── constants.ts               # 常數
│   ├── utils.ts                   # 工具函式
│   └── services/
│       ├── transcription.ts       # Whisper 轉錄
│       ├── summarization.ts       # Claude 摘要
│       └── pipeline.ts           # 背景處理管線
├── prisma/
│   └── schema.prisma
├── public/
├── .env.example
├── .gitignore
├── Dockerfile
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```
