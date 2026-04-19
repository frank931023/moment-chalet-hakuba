# Moment Chalet Hakuba — 民宿預訂系統

> 一套為日本白馬村精品民宿集團打造的全端線上預訂平台，整合 AI 客服機器人、PayPal 金流、iCal 自動同步與 Azure 雲端監控。

---

## 背景故事

白馬村（Hakuba Village）是日本長野縣的知名滑雪勝地，每年吸引大量來自台灣、香港、澳洲的旅客。Moment Chalet Hakuba 是一個擁有九間精品山莊的民宿集團，過去依賴 Airbnb 和 Booking.com 管理預訂，面臨以下痛點：

- **雙重預訂風險**：各平台日曆無法即時同步，容易發生 overbooking
- **金流不統一**：沒有自己的直訂管道，平台抽成高
- **客服效率低**：旅客問題重複，人工回覆耗時
- **費用不透明**：Azure 雲端費用散落各處，難以掌握

本專案從零打造一套完整的直訂系統，解決以上所有問題。

---

## 功能亮點

### 旅客端
- 瀏覽九間民宿，支援地點、人數、價格、日期篩選
- 互動式地圖（Leaflet + OpenStreetMap）顯示民宿位置
- 三步驟預訂流程：選日期 → 填資料 → PayPal 付款
- 早餐選項加購
- 訂單查詢與退款申請
- 多語系支援：繁體中文 / English / 日本語
- AI 客服機器人（RAG 架構，根據民宿知識庫回答）

### 後台管理
- 訂單管理：查看、篩選、執行退款
- 民宿與房型 CRUD，含圖片上傳與地圖座標選取
- iCal 同步管理：手動觸發或自動每小時同步 Airbnb / Booking.com 日曆
- Azure 費用監控：費用趨勢、預算警示進度條、週報比較
- AI 機器人管理：Token 用量、對話紀錄查詢、知識庫文件上傳

---

## 技術架構

```
┌─────────────────────────────────────────────────────────┐
│                    使用者瀏覽器                           │
│  Vue 3 SPA (Azure Static Web Apps)                      │
│  Tailwind CSS + PrimeVue + Leaflet + PayPal JS SDK      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│                   Supabase Cloud                         │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ PostgreSQL  │  │   Auth   │  │  Storage (images)  │  │
│  │ + pgvector  │  └──────────┘  └────────────────────┘  │
│  └─────────────┘                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Edge Functions (Deno)                  │ │
│  │  bookings │ paypal-* │ ical-sync │ email-send       │ │
│  │  chat (RAG) │ documents                             │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   Azure Cloud                            │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │ Azure Functions  │  │  Azure Monitor + Logic Apps  │  │
│  │ Timer: iCal 同步 │  │  費用警示 Email 通知          │  │
│  │ Timer: 費用快照  │  └──────────────────────────────┘  │
│  └──────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 技術選型

### 前端

| 技術 | 用途 |
|------|------|
| [Vue 3](https://vuejs.org/) + Vite | 主框架，Composition API |
| [TypeScript](https://www.typescriptlang.org/) | 全端型別安全 |
| [Tailwind CSS v3](https://tailwindcss.com/) | 樣式系統 |
| [PrimeVue 4](https://primevue.org/) | UI 元件庫 |
| [Pinia](https://pinia.vuejs.org/) | 狀態管理 |
| [Vue Router 4](https://router.vuejs.org/) | SPA 路由 |
| [vue-i18n](https://vue-i18n.intlify.dev/) | 多語系（zh-TW / en / ja） |
| [Leaflet](https://leafletjs.com/) + vue-leaflet | 互動地圖 |
| [v-calendar](https://vcalendar.io/) | 日期範圍選擇器 |
| [PayPal JS SDK](https://developer.paypal.com/sdk/js/) | 前端付款按鈕 |
| [@vueuse/head](https://github.com/vueuse/head) | SEO meta 管理 |
| [axios](https://axios-http.com/) | HTTP 請求 |

### 後端

| 技術 | 用途 |
|------|------|
| [Supabase](https://supabase.com/) | BaaS：PostgreSQL + Auth + Storage + Edge Functions |
| [pgvector](https://github.com/pgvector/pgvector) | 向量資料庫（RAG 知識庫） |
| Deno (TypeScript) | Edge Functions 執行環境 |
| [OpenAI API](https://platform.openai.com/) | GPT-4o-mini 對話 + text-embedding-3-small 向量化 |
| [PayPal Orders API](https://developer.paypal.com/) | 建立訂單、捕捉付款、退款 |
| [Resend](https://resend.com/) | 交易 Email（訂單確認、退款通知） |

### 雲端 / DevOps

| 技術 | 用途 |
|------|------|
| [Azure Static Web Apps](https://azure.microsoft.com/products/app-service/static) | 前端部署（CDN + SSL） |
| [Azure Functions](https://azure.microsoft.com/products/functions) | 定時任務（iCal 同步、費用快照） |
| [Azure Cost Management API](https://learn.microsoft.com/azure/cost-management-billing/) | 費用資料抓取 |
| [Azure Monitor + Logic Apps](https://azure.microsoft.com/products/monitor) | 費用超標警示 |
| GitHub Actions | CI/CD 自動部署 |

### 測試

| 技術 | 用途 |
|------|------|
| [Vitest](https://vitest.dev/) | 單元測試 |
| [fast-check](https://fast-check.io/) | 屬性測試（Property-Based Testing） |
| [@vue/test-utils](https://test-utils.vuejs.org/) | Vue 元件測試 |
| [Playwright](https://playwright.dev/) | E2E 端對端測試 |

---

## RAG 架構（AI 客服機器人）

本專案的 chatbot 採用 **Retrieval-Augmented Generation** 架構，讓 AI 根據民宿實際資料回答，而非依賴模型本身的訓練知識。

```
使用者問題
    ↓
text-embedding-3-small 向量化
    ↓
pgvector 相似度搜尋（cosine similarity）
    ↓
取出最相關的 4 筆知識庫文件
    ↓
注入 GPT-4o-mini system prompt
    ↓
生成貼近實際資訊的回覆
```

知識庫文件（民宿介紹、設施說明、常見問題等）可透過後台 `/admin/chatbot` 頁面上傳管理。

---

## 專案結構

```
├── src/
│   ├── components/        # 共用元件（Navbar, RoomCard, DateRangePicker...）
│   ├── views/             # 頁面元件
│   │   ├── admin/         # 後台管理頁面
│   ├── stores/            # Pinia 狀態管理
│   ├── router/            # Vue Router 設定
│   ├── i18n/              # 多語系設定
│   ├── locales/           # 翻譯檔（zh-TW, en, ja）
│   ├── lib/               # Supabase client, axios instance
│   ├── utils/             # 工具函式
│   ├── types/             # TypeScript 型別定義
│   ├── mock/              # Mock 資料（無 key 時的示範模式）
│   └── tests/             # 屬性測試套件
├── supabase/
│   ├── functions/         # Edge Functions (Deno)
│   │   ├── bookings/
│   │   ├── chat/          # RAG chatbot
│   │   ├── documents/     # 知識庫文件上傳
│   │   ├── paypal-create-order/
│   │   ├── paypal-capture-order/
│   │   ├── paypal-refund/
│   │   ├── ical-sync/
│   │   └── email-send/
│   ├── migrations/        # 資料庫 schema
│   └── seed.sql           # 初始民宿資料
├── azure-functions/       # Azure Timer Triggers (Node.js)
│   ├── ical-sync/
│   └── cost-snapshot/
├── e2e/                   # Playwright E2E 測試
└── .github/workflows/     # GitHub Actions CI/CD
```

---

## 快速開始

```bash
# 安裝依賴
npm install

# 啟動開發伺服器（Mock 模式，無需任何 API Key）
npm run dev
```

開啟 [http://localhost:5173](http://localhost:5173) 即可看到完整 UI，包含九間民宿的示範資料。

詳細環境設定請參考 [SETUP.md](./SETUP.md)。

---

## 測試

```bash
# 單元測試 + 屬性測試（238 個測試）
npm run test

# TypeScript 型別檢查
npm run type-check

# E2E 測試（需先啟動 dev server）
npm run test:e2e
```

---

## License

MIT
