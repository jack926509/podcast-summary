# 🎙️ Podcast Summarizer

個人用 Podcast 內容摘要與記錄系統 — 上傳音檔或輸入 RSS Feed，自動產生逐字稿、摘要、重點與金句。

## 功能

- **音檔上傳**：支援 mp3 / wav，大檔自動分段處理
- **RSS Feed**：貼上 Podcast Feed URL，選擇集數批次處理
- **語音轉文字**：透過 OpenAI Whisper API 產生逐字稿
- **AI 摘要**：透過 Anthropic Claude API 產出整體摘要、分段重點與金句
- **歷史記錄**：所有處理結果存入 SQLite，隨時查閱

## 技術堆疊

| 類別 | 技術 |
|------|------|
| 框架 | Next.js 14+ (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| 資料庫 | SQLite + Prisma |
| 轉錄 | OpenAI Whisper API |
| 摘要 | Anthropic Claude API |
| 音訊處理 | ffmpeg |
| 部署 | Zeabur |

## 快速開始

### 前置需求

- Node.js 20+
- ffmpeg（`brew install ffmpeg` 或 `apt install ffmpeg`）
- OpenAI API Key
- Anthropic API Key

### 安裝

```bash
git clone https://github.com/your-username/podcast-summarizer.git
cd podcast-summarizer
npm install
```

### 環境變數

複製範例檔並填入 API Key：

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

3. 新增 Persistent Volume，掛載路徑 `/var/data`（1GB）
4. 若需 ffmpeg，使用專案內的 `Dockerfile` 部署

### 3. Build 指令（自動偵測或手動填入）

```
Build:  npx prisma generate && npx prisma db push && npm run build
Start:  npm start
```

## 專案結構

```
app/              → 頁面與 API Routes
components/       → React 元件
hooks/            → 自訂 Hooks
lib/              → 工具函式與服務
  services/       → Whisper / Claude / Pipeline
prisma/           → Schema 定義
```

詳細建置流程請參考 [BUILD_GUIDE.md](./BUILD_GUIDE.md)。

## License

MIT
