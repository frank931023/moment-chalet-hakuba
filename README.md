# Moment Chalet Hakuba — 民宿預訂系統

一套為日本白馬村精品民宿集團打造的全端線上預訂平台:Vue 3 + Supabase + PayPal,支援多語系、iCal 雙向同步、AI 客服機器人。

> 本專案專注前端 + Supabase。Azure 相關元件(Static Web Apps、Functions、Cost Management)已從程式碼移除,部署可改用 Vercel / Netlify / Cloudflare Pages 等任何靜態託管。

---

## 快速開始 (3 分鐘看到畫面)

```bash
npm install
npm run dev
```

打開 [http://localhost:5173](http://localhost:5173) — 在 `.env` 保留預設 placeholder 時,前端會自動進入 **Mock 模式**,讀取 [src/mock/data.ts](src/mock/data.ts) 的假資料,可以完整瀏覽九間民宿、走完訂房流程,不需要任何外部服務。

---

## 接上真正的 Supabase

如果想用真實資料庫(訂單會被儲存、後台可看到):

### 1. 建立 Supabase 專案

到 [supabase.com/dashboard](https://supabase.com/dashboard) 建立新專案,從 `Settings → API` 取得三個 key,填到 [.env](.env):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...           # public anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # 只給 seed 腳本與 Edge Functions 使用
```

### 2. 套用資料庫 schema

在 Supabase Dashboard → `SQL Editor`,**依序**貼上並執行下列檔案的內容:

1. [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) — properties / room_types / bookings / blocked_dates
2. [supabase/migrations/002_auxiliary_tables.sql](supabase/migrations/002_auxiliary_tables.sql) — chat_logs / llm_usage_snapshots
3. [supabase/migrations/003_rls_and_indexes.sql](supabase/migrations/003_rls_and_indexes.sql) — Row Level Security
4. (選用)[supabase/migrations/004_rag_documents.sql](supabase/migrations/004_rag_documents.sql) — pgvector + RAG documents

### 3. 注入示範資料

```bash
node scripts/seed.mjs
```

會自動寫入 **9 間民宿、27 個房型、5 筆示範訂單、3 段封鎖日期**。腳本是 idempotent 的 — 重跑會先清空再重寫。

### 4. (選用)建立後台管理員

在 Supabase Dashboard → `Authentication → Users → Add user` 新增一個 email/password 帳號。前端 `/admin/login` 用同樣的密碼登入即可進後台。

---

## 專案結構

```
├── src/
│   ├── components/        # 共用元件 (Navbar, RoomCard, DateRangePicker, ChatbotWidget, ...)
│   ├── views/             # 頁面
│   │   └── admin/         # 後台 (Dashboard / Bookings / Properties / iCal / Chatbot)
│   ├── stores/            # Pinia (auth / property / booking / chat)
│   ├── router/            # Vue Router
│   ├── layouts/           # AdminLayout
│   ├── i18n/, locales/    # 多語系 (zh-TW / en / ja)
│   ├── lib/               # supabase client, axios
│   ├── utils/             # 純函式工具
│   ├── types/             # TypeScript types
│   ├── mock/              # Mock 模式用的假資料
│   └── tests/             # 屬性測試 (fast-check)
├── supabase/
│   ├── migrations/        # SQL schema 檔
│   ├── functions/         # Edge Functions (Deno):bookings / paypal-* / ical-sync / chat / documents / email-send
│   └── seed.sql           # 完整 seed (SQL 版,可貼進 SQL Editor)
├── scripts/
│   └── seed.mjs           # 用 service role key 寫入示範資料的 Node 腳本
├── e2e/                   # Playwright E2E 測試
└── public/                # 靜態資產
```

---

## 技術棧

**前端**:Vue 3 + Vite、TypeScript、Pinia、Vue Router、Tailwind CSS、PrimeVue 4、vue-i18n、Leaflet (+ vue-leaflet)、v-calendar、@vueuse/head、axios

**後端 / BaaS**:Supabase (PostgreSQL + Auth + Storage + Edge Functions),選用 pgvector 做 RAG

**金流**:PayPal Orders API (前端 JS SDK + 後端 capture/refund)

**測試**:Vitest、fast-check、@vue/test-utils、Playwright

---

## 常用指令

```bash
npm run dev          # 開發伺服器  (Mock 或真實 Supabase)
npm run build        # 型別檢查 + 產生 dist/
npm run type-check   # vue-tsc --noEmit
npm run test         # 單元 + 屬性測試
npm run test:e2e     # Playwright
npm run lint         # ESLint 自動修正

node scripts/seed.mjs   # 重新注入示範資料 (需要真實 Supabase)
```

---

## Mock 模式 vs Supabase 模式

| 功能 | Mock 模式 | Supabase 模式 |
|------|-----------|---------------|
| 瀏覽民宿與房型 | ✓ 從 `src/mock/data.ts` | ✓ 從 `properties` / `room_types` |
| 三步驟訂房流程 UI | ✓ | ✓ |
| 訂單實際寫入 | ✗ (停留在前端 state) | ✓ |
| 後台管理 (登入、訂單、退款) | ✗ | ✓ |
| AI 客服機器人 | 固定假回覆 | ✓ (需 OpenAI key) |
| PayPal 付款 | 略過 | ✓ (需 PayPal key) |

切換方式由 [src/lib/supabase.ts](src/lib/supabase.ts) 的 `IS_MOCK_MODE` 自動判斷:`.env` 沒填或留 `placeholder` 字樣就走 Mock。

---

## License

MIT
