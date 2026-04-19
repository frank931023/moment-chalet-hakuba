# Moment Chalet Hakuba — 環境設定指南

> 本文件帶你從零開始，一步一步完成所有服務的申請、設定與本地開發環境啟動。

---

## 目錄

1. [前置需求](#1-前置需求)
2. [取得程式碼](#2-取得程式碼)
3. [Supabase 設定](#3-supabase-設定)
4. [PayPal 沙盒設定](#4-paypal-沙盒設定)
5. [Email 服務設定（Resend）](#5-email-服務設定resend)
6. [AI 聊天機器人設定（OpenAI）](#6-ai-聊天機器人設定openai)
7. [RAG 知識庫設定（pgvector）](#7-rag-知識庫設定pgvector)
8. [建立 `.env` 檔案](#8-建立-env-檔案)
9. [安裝依賴與啟動開發伺服器](#9-安裝依賴與啟動開發伺服器)
10. [執行測試](#10-執行測試)
11. [Azure 部署設定（選用）](#11-azure-部署設定選用)
12. [常見問題](#12-常見問題)
3. [Supabase 設定](#3-supabase-設定)
4. [PayPal 沙盒設定](#4-paypal-沙盒設定)
5. [Email 服務設定（Resend）](#5-email-服務設定resend)
6. [AI 聊天機器人設定（OpenAI）](#6-ai-聊天機器人設定openai)
7. [建立 `.env` 檔案](#7-建立-env-檔案)
8. [安裝依賴與啟動開發伺服器](#8-安裝依賴與啟動開發伺服器)
9. [執行測試](#9-執行測試)
10. [Azure 部署設定（選用）](#10-azure-部署設定選用)
11. [常見問題](#11-常見問題)

---

## 1. 前置需求

請先確認以下工具已安裝：

| 工具 | 版本需求 | 安裝指令 |
|------|---------|---------|
| Node.js | >= 18.0.0 | [nodejs.org](https://nodejs.org/) |
| npm | >= 9.0.0 | 隨 Node.js 一起安裝 |
| Git | 任意版本 | [git-scm.com](https://git-scm.com/) |
| Supabase CLI | 最新版 | `npm install -g supabase` |

確認版本：

```bash
node -v      # 應顯示 v18.x.x 或以上
npm -v       # 應顯示 9.x.x 或以上
supabase --version
```

---

## 2. 取得程式碼

```bash
# 複製專案（或直接在現有目錄操作）
git clone <your-repo-url> moment-chalet
cd moment-chalet
```

---

## 3. Supabase 設定

Supabase 是本專案的後端核心（資料庫、Auth、Storage、Edge Functions）。

### 3.1 建立 Supabase 專案

1. 前往 [https://supabase.com](https://supabase.com) 並登入（或免費註冊）
2. 點擊 **New Project**
3. 填寫：
   - **Project name**：`moment-chalet-hakuba`（或任意名稱）
   - **Database Password**：設定一個強密碼並記下來
   - **Region**：選擇 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`
4. 點擊 **Create new project**，等待約 1 分鐘建立完成

### 3.2 取得 API Keys

建立完成後，前往 **Settings → API**：

| 欄位 | 對應環境變數 | 說明 |
|------|------------|------|
| Project URL | `VITE_SUPABASE_URL` | 例：`https://abcdefgh.supabase.co` |
| `anon` `public` key | `VITE_SUPABASE_ANON_KEY` | 前端公開使用 |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` | **僅後端使用，勿外洩** |

> ⚠️ `service_role` key 擁有完整資料庫存取權，絕對不能放入前端程式碼或 Git。

### 3.3 執行資料庫 Migration

```bash
# 登入 Supabase CLI
supabase login

# 連結到你的專案（project-ref 是 URL 中的 ID，例如 abcdefgh）
supabase link --project-ref <your-project-ref>

# 執行所有 migration
supabase db push
```

或者直接在 Supabase Dashboard → **SQL Editor** 中，依序貼上並執行：
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_auxiliary_tables.sql`
3. `supabase/migrations/003_rls_and_indexes.sql`

### 3.4 匯入 Seed 資料（九間民宿初始資料）

在 Supabase Dashboard → **SQL Editor** 中貼上並執行：

```
supabase/seed.sql
```

### 3.5 建立 Storage Bucket

前往 **Storage → New bucket**：
- **Bucket name**：`images`
- **Public bucket**：✅ 勾選（讓前端可以直接讀取圖片 URL）

### 3.6 部署 Edge Functions

```bash
# 部署所有 Edge Functions
supabase functions deploy bookings
supabase functions deploy paypal-create-order
supabase functions deploy paypal-capture-order
supabase functions deploy paypal-refund
supabase functions deploy ical-sync
supabase functions deploy email-send
supabase functions deploy chat
supabase functions deploy documents
```

```bash
supabase secrets set PAYPAL_CLIENT_ID=<your-paypal-client-id>
supabase secrets set PAYPAL_CLIENT_SECRET=<your-paypal-client-secret>
supabase secrets set RESEND_API_KEY=<your-resend-api-key>
supabase secrets set LLM_API_KEY=<your-openai-api-key>
```

---

## 4. PayPal 沙盒設定

### 4.1 建立 PayPal Developer 帳號

1. 前往 [https://developer.paypal.com](https://developer.paypal.com)
2. 用你的 PayPal 帳號登入（或免費申請）
3. 前往 **Apps & Credentials**

### 4.2 建立沙盒應用程式

1. 點擊 **Create App**
2. 填寫：
   - **App Name**：`Moment Chalet Dev`
   - **Sandbox account**：選擇預設的沙盒帳號
3. 點擊 **Create App**

### 4.3 取得 API Keys

建立後你會看到：

| 欄位 | 對應環境變數 |
|------|------------|
| Client ID | `VITE_PAYPAL_CLIENT_ID` |
| Secret | `PAYPAL_CLIENT_SECRET` |

> 確認頁面上方切換到 **Sandbox** 模式（不是 Live）

### 4.4 建立測試買家帳號

1. 前往 **Sandbox → Accounts**
2. 點擊 **Create Account**，類型選 **Personal**（買家）
3. 記下測試帳號的 email 和密碼，之後測試付款時使用

---

## 5. Email 服務設定（Resend）

### 5.1 申請 Resend 帳號

1. 前往 [https://resend.com](https://resend.com) 免費註冊
2. 前往 **API Keys → Create API Key**
3. 名稱填 `moment-chalet`，權限選 **Full access**
4. 複製 API Key（只顯示一次）

| 欄位 | 對應環境變數 |
|------|------------|
| API Key | `RESEND_API_KEY` |

### 5.2 設定寄件網域（選用，正式環境需要）

開發測試時可以用 Resend 提供的預設網域 `onboarding@resend.dev`。
正式上線前需要在 **Domains** 中新增並驗證你的網域。

---

## 6. AI 聊天機器人設定（OpenAI）

### 6.1 申請 OpenAI API Key

1. 前往 [https://platform.openai.com](https://platform.openai.com) 登入
2. 前往 **API Keys → Create new secret key**
3. 名稱填 `moment-chalet`
4. 複製 API Key（只顯示一次）

| 欄位 | 對應環境變數 |
|------|------------|
| API Key | `LLM_API_KEY` |

> 💡 本專案使用 `gpt-4o-mini` 模型（對話）+ `text-embedding-3-small`（RAG 向量搜尋）。
> 建議在 OpenAI Dashboard 設定月費上限以控制成本。

---

## 7. RAG 知識庫設定（pgvector）

> RAG（Retrieval-Augmented Generation）讓 chatbot 在回答前先搜尋你上傳的文件，
> 回答會更準確、更貼近你的民宿實際資訊，而不是靠 AI 自己猜。

### 架構說明

```
使用者問題
    ↓
轉成 embedding（text-embedding-3-small）
    ↓
在 Supabase pgvector 搜尋相似文件
    ↓
把相關文件塞進 system prompt
    ↓
GPT-4o-mini 根據文件回答
    ↓
回覆使用者
```


### 7.1 啟用 pgvector 擴充套件

在 Supabase Dashboard → **SQL Editor** 執行：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

然後執行 migration：

```bash
supabase db push
# 或手動在 SQL Editor 執行 supabase/migrations/004_rag_documents.sql
```

### 7.2 部署 documents Edge Function

設定 Edge Functions 的 Secrets（在 Dashboard → **Settings → Edge Functions → Secrets** 或用 CLI）：

### 7.3 上傳文件到知識庫

文件上傳需要 Admin JWT。先登入後台取得 token，或用 Supabase Dashboard 的 service role key 直接呼叫：

**方法 A：用 curl 上傳**

```bash
curl -X POST https://你的專案ID.supabase.co/functions/v1/documents \
  -H "Authorization: Bearer <你的-service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Moment Chalet A 民宿介紹",
    "content": "Moment Chalet A 位於長野縣北安曇郡白馬村北城，距離白馬八方尾根滑雪場步行10分鐘。民宿提供暖爐、WiFi、免費停車場。入住時間為15:00，退房時間為11:00。",
    "metadata": {
      "source": "property-guide",
      "property": "chalet-a",
      "locale": "zh-TW"
    }
  }'
```

**方法 B：用後台管理頁面上傳（建議）**

後台 `/admin/chatbot` 頁面提供文件管理介面，可以直接貼上文字上傳。

### 7.4 建議上傳的文件類型

| 文件類型 | 範例內容 |
|---------|---------|
| 民宿介紹 | 各民宿的設施、特色、位置說明 |
| 入退房規定 | 入住時間、退房時間、取消政策 |
| 周邊景點 | 白馬村滑雪場、健行路線、交通資訊 |
| 常見問題 | 停車、寵物、嬰兒床、早餐時間等 |
| 預訂說明 | 付款方式、退款政策、特殊需求處理 |

### 7.5 文件格式建議

- 每份文件建議 **200~800 字**，太長會被自動切割成多個 chunks
- 用**清楚的標題**，例如「Moment Chalet A — 設施說明」
- 可以用 `metadata.locale` 標記語言，讓搜尋更精準：
  ```json
  { "locale": "zh-TW", "category": "facilities", "property": "chalet-a" }
  ```

### 7.6 測試 RAG 效果

上傳文件後，在前台 chatbot 問相關問題，應該會看到回答更具體、更準確。

如果回答還是很模糊，可以：
1. 降低相似度門檻（`match_threshold`，預設 0.65）
2. 增加搜尋筆數（`match_count`，預設 4）
3. 把文件切得更細（`chunk_size` 調小）

這些參數在 `supabase/functions/chat/index.ts` 中調整。

---

## 8. 建立 `.env` 檔案

在專案根目錄複製範例檔案：

```bash
cp .env.example .env
```

用文字編輯器開啟 `.env`，填入以下必要的值：

```dotenv
# ===== 必填 =====

# Supabase（從 Dashboard → Settings → API 取得）
VITE_SUPABASE_URL=https://你的專案ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（anon key）

# PayPal 沙盒（從 developer.paypal.com 取得）
VITE_PAYPAL_CLIENT_ID=AaBbCcDd...（Sandbox Client ID）

# ===== 選填（沒有這些功能仍可運行，但部分功能會失效）=====

# Email（Resend）
RESEND_API_KEY=re_xxxxxxxx

# AI 聊天機器人（OpenAI）
# 這個 key 是給 Supabase Edge Function 用的，不需要放前端
# 請用 supabase secrets set LLM_API_KEY=... 設定
```

> ⚠️ `.env` 已在 `.gitignore` 中，不會被提交到 Git。

---

## 9. 安裝依賴與啟動開發伺服器

```bash
# 安裝所有 npm 依賴
npm install

# 啟動開發伺服器
npm run dev
```

瀏覽器開啟 [http://localhost:5173](http://localhost:5173)

你應該會看到 Moment Chalet Hakuba 的首頁。

### 後台管理介面

後台網址：[http://localhost:5173/admin/login](http://localhost:5173/admin/login)

**登入帳號從哪裡來？**

後台使用 Supabase Auth，你需要先在 Supabase 建立一個管理員帳號：

1. 前往 Supabase Dashboard → **Authentication → Users**
2. 點擊 **Add user → Create new user**
3. 填入 Email 和 Password（這就是你的後台登入帳密）
4. 點擊 **Create user**

然後回到 [http://localhost:5173/admin/login](http://localhost:5173/admin/login) 用剛才設定的帳密登入。

**後台功能頁面：**

| 路徑 | 功能 |
|------|------|
| `/admin` | 儀表板 |
| `/admin/bookings` | 訂單管理（查看所有訂單、執行退款） |
| `/admin/properties` | 民宿管理（新增/編輯民宿與房型） |
| `/admin/ical` | iCal 同步管理（手動觸發同步） |
| `/admin/costs` | Azure 費用監控 |
| `/admin/chatbot` | AI 機器人管理（查看對話紀錄、上傳知識庫文件） |

> 💡 **Mock 模式下**（沒有 Supabase key）：後台訂單管理頁會顯示 5 筆假訂單，其他頁面資料為空。登入功能在 mock 模式下不會真的驗證，直接進入後台即可。

### 常用指令

```bash
npm run dev          # 啟動開發伺服器（熱重載）
npm run build        # 建置生產版本（輸出到 dist/）
npm run preview      # 預覽生產版本
npm run test         # 執行所有單元測試（Vitest）
npm run test:watch   # 監聽模式執行測試
npm run type-check   # TypeScript 型別檢查
```

---

## 10. 執行測試

### 單元測試 + 屬性測試（Vitest）

```bash
npm run test
```

預期輸出：26 個測試檔案，238 個測試全部通過。

### E2E 測試（Playwright）

E2E 測試需要先啟動開發伺服器：

```bash
# 終端機 1：啟動開發伺服器
npm run dev

# 終端機 2：執行 E2E 測試
npm run test:e2e

# 或只跑特定測試
npx playwright test e2e/booking.spec.ts
```

首次執行需要安裝瀏覽器：

```bash
npx playwright install chromium
```

---

## 11. Azure 部署設定（選用）

> 如果只是本地開發，可以跳過這個章節。

### 10.1 建立 Azure Static Web Apps

1. 登入 [Azure Portal](https://portal.azure.com)
2. 搜尋 **Static Web Apps** → **Create**
3. 填寫：
   - **Resource Group**：建立新的，例如 `rg-moment-chalet`
   - **Name**：`moment-chalet-hakuba`
   - **Region**：`East Asia`
   - **Source**：GitHub（連結你的 repo）
4. 建立完成後，前往 **Settings → Configuration** 新增環境變數：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PAYPAL_CLIENT_ID`

### 10.2 取得 Deployment Token

前往 Static Web App → **Manage deployment token**，複製 token。

在 GitHub repo → **Settings → Secrets → Actions** 新增：
- `AZURE_STATIC_WEB_APPS_API_TOKEN` = 剛才複製的 token

之後每次 push 到 `main` branch，GitHub Actions 會自動部署。

### 10.3 Azure Functions 部署

```bash
cd azure-functions
npm install
npm run build

# 需要先安裝 Azure Functions Core Tools
# npm install -g azure-functions-core-tools@4

func azure functionapp publish <your-function-app-name>
```

在 Azure Portal → Function App → **Configuration** 新增：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`

---

## 12. 常見問題

### Q: 啟動後看到空白頁面或 console 有 Supabase 錯誤

確認 `.env` 中的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 已正確填寫，且 Supabase 專案已建立。

### Q: 民宿列表是空的

確認已執行 `supabase/seed.sql`（步驟 3.4）。

### Q: PayPal 按鈕沒有出現

確認 `VITE_PAYPAL_CLIENT_ID` 已填寫，且使用的是 Sandbox Client ID（不是 Live）。

### Q: 聊天機器人沒有回應

確認已用 `supabase secrets set LLM_API_KEY=...` 設定 OpenAI API Key，並重新部署 `chat` Edge Function。

### Q: 測試失敗

```bash
# 確認 .env.test 存在（測試環境用）
cp .env.example .env.test
# 填入測試用的假值即可，測試不會真的呼叫外部 API
```

### Q: `npm install` 失敗

確認 Node.js 版本 >= 18：
```bash
node -v
# 如果版本太舊，用 nvm 切換：
nvm install 18
nvm use 18
```

---

## 快速參考：所有需要的 Keys

| Key | 從哪裡取得 | 放在哪裡 |
|-----|----------|---------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API | `.env` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | Supabase Secrets（不放 `.env`） |
| `VITE_PAYPAL_CLIENT_ID` | PayPal Developer → Apps & Credentials | `.env` |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer → Apps & Credentials | Supabase Secrets |
| `RESEND_API_KEY` | Resend Dashboard → API Keys | Supabase Secrets |
| `LLM_API_KEY` | OpenAI Platform → API Keys | Supabase Secrets |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Azure Portal → Static Web App | GitHub Secrets |

---

> 有任何問題，歡迎開 Issue 或聯絡開發團隊。
