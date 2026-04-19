# 需求文件

## 簡介

本文件定義「Moment Chalet Hakuba」民宿預訂系統的功能需求。該系統為一套完整的線上預訂平台，涵蓋九間位於日本白馬村的民宿，提供旅客瀏覽民宿、線上預訂、PayPal 付款、訂單查詢與退款申請等功能，並配備後台管理介面供業者管理訂單、民宿資料、iCal 同步、Azure 費用監控及 AI 聊天機器人。

系統採用 Vue 3 SPA 前端搭配 Supabase 後端，部署於 Azure Static Web Apps，支援繁體中文、英文、日文三語系，並具備完整 RWD 響應式設計。

---

## 詞彙表

- **System**：整個 Moment Chalet Hakuba 預訂系統
- **Frontend**：Vue 3 SPA 前端應用程式
- **Backend**：Supabase 後端服務（PostgreSQL、Auth、Storage、Edge Functions）
- **Guest**：使用前台進行瀏覽與預訂的旅客
- **Admin**：使用後台管理介面的業者或管理員
- **Property**：民宿（共九間，主視覺為 Moment Chalet Hakuba）
- **Room_Type**：民宿下的房型
- **Booking**：旅客建立的訂單
- **Blocked_Date**：透過 iCal 同步或手動設定的已佔用日期
- **iCal_Sync**：從 Airbnb / Booking.com 匯出的 iCal feed 同步機制
- **PayPal_Gateway**：PayPal JS SDK 與 Supabase Edge Functions 組成的金流模組
- **Chatbot**：整合 LLM API 的 AI 問答機器人
- **Admin_Dashboard**：後台管理介面
- **Cost_Monitor**：Azure 費用監控模組
- **LLM_Tracker**：LLM API 用量追蹤模組
- **Navbar**：頂部導覽列元件
- **DateRangePicker**：整合已佔用日期的日曆元件
- **i18n**：多語系國際化模組（vue-i18n）

---

## 需求

### 需求 1：民宿列表與瀏覽

**User Story：** 身為旅客，我希望能瀏覽所有民宿的列表與詳細資訊，以便選擇適合的住宿。

#### 驗收標準

1. THE System SHALL 在首頁顯示九間民宿的卡片式快速導覽，每張卡片包含封面圖、民宿名稱、地點與起始價格。
2. THE Frontend SHALL 在民宿列表頁提供依地點、入住日期、退房日期、人數與價格區間的篩選功能。
3. WHEN Guest 切換至地圖模式，THE Frontend SHALL 在地圖上顯示各民宿的位置 pin 與起始價格標籤。
4. WHEN Guest 點擊民宿卡片或「查看詳情」按鈕，THE Frontend SHALL 導覽至該民宿的詳情頁。
5. THE Frontend SHALL 在民宿詳情頁顯示圖片輪播、民宿名稱、地址、簡介、房型列表、設施清單、地圖與旅客評價。
6. WHEN Guest 點擊詳情頁地圖上的 pin，THE Frontend SHALL 支援地圖縮放並提供街景連結。

---

### 需求 2：房型選擇與早餐選項

**User Story：** 身為旅客，我希望能查看各房型的詳細資訊並選擇是否加購早餐，以便規劃我的住宿內容。

#### 驗收標準

1. THE Frontend SHALL 在民宿詳情頁以獨立卡片呈現每個房型，卡片包含圖片、名稱、容納人數、設施清單與每晚價格。
2. WHERE Property 的 `has_breakfast_option` 為 `true`，THE Frontend SHALL 在房型卡片上顯示「含早餐 / 不含早餐」的切換選項（toggle 或 radio）。
3. WHEN Guest 選擇含早餐選項，THE Frontend SHALL 在訂單摘要中反映早餐費用並更新總金額。
4. THE Frontend SHALL 在預訂頁步驟一顯示已選房型的確認資訊，包含房型名稱、容納人數、每晚價格與早餐選項。

---

### 需求 3：日期選擇與可用性檢查

**User Story：** 身為旅客，我希望在選擇入退房日期時能清楚看到哪些日期已被佔用，以避免選到無法預訂的日期。

#### 驗收標準

1. THE Frontend SHALL 在預訂頁步驟一顯示 DateRangePicker 日曆元件供 Guest 選擇入住與退房日期。
2. WHEN DateRangePicker 載入，THE Frontend SHALL 從 Supabase 查詢對應 Property 的 `blocked_dates`，並將已佔用日期以灰色標示且設為不可選取。
3. IF Guest 嘗試選擇已被佔用的日期，THEN THE Frontend SHALL 阻止該選擇並顯示提示訊息。
4. IF Guest 選擇的退房日期早於或等於入住日期，THEN THE Frontend SHALL 顯示錯誤提示並要求重新選擇。
5. THE Frontend SHALL 依目前語系調整日期顯示格式（zh-TW: YYYY/MM/DD、en: MM/DD/YYYY、ja: YYYY年MM月DD日）。

---

### 需求 4：預訂流程（三步驟）

**User Story：** 身為旅客，我希望透過清晰的步驟完成預訂，以便順利確認我的住宿安排。

#### 驗收標準

1. THE Frontend SHALL 在預訂頁頂部顯示步驟條，標示目前所在步驟（步驟一：選擇日期與房型 / 步驟二：填寫資料 / 步驟三：付款）。
2. WHEN Guest 完成步驟一的日期與房型選擇，THE Frontend SHALL 啟用「下一步」按鈕並允許進入步驟二。
3. THE Frontend SHALL 在步驟二要求 Guest 填寫旅客姓名、Email、電話與特殊需求備註。
4. IF Guest 在步驟二未填寫必填欄位（姓名、Email、電話），THEN THE Frontend SHALL 顯示欄位驗證錯誤並阻止進入步驟三。
5. THE Frontend SHALL 在步驟三顯示完整訂單摘要，包含民宿名稱、房型、入退房日期、早餐選項與總金額。
6. WHEN Guest 完成 PayPal 付款，THE Frontend SHALL 呼叫 `/functions/v1/paypal/capture-order` 並在成功後導覽至訂單確認頁。

---

### 需求 5：PayPal 金流

**User Story：** 身為旅客，我希望能透過 PayPal 安全地完成付款，以便確認我的預訂。

#### 驗收標準

1. WHEN Guest 在步驟三點擊 PayPal 付款按鈕，THE PayPal_Gateway SHALL 呼叫 `/functions/v1/paypal/create-order` 建立 PayPal 訂單並取得 order ID。
2. WHEN PayPal 訂單建立成功，THE Frontend SHALL 透過 PayPal JS SDK 開啟付款視窗供 Guest 完成付款。
3. WHEN Guest 完成 PayPal 付款，THE PayPal_Gateway SHALL 呼叫 `/functions/v1/paypal/capture-order` 向 PayPal 確認捕捉付款。
4. WHEN 付款捕捉成功，THE Backend SHALL 將訂單狀態更新為 `confirmed`，並記錄 `paypal_order_id` 與 `paypal_capture_id`。
5. WHEN 訂單狀態更新為 `confirmed`，THE Backend SHALL 透過 `/functions/v1/email/send` 寄送訂單確認 Email 至 Guest 的 Email 地址。
6. IF PayPal 付款流程發生錯誤，THEN THE Frontend SHALL 顯示錯誤訊息並允許 Guest 重試付款。

---

### 需求 6：訂單確認頁

**User Story：** 身為旅客，我希望付款後能看到訂單確認資訊，以便確認預訂已成功。

#### 驗收標準

1. WHEN Guest 被導覽至訂單確認頁，THE Frontend SHALL 顯示訂單編號、民宿名稱、房型、入退房日期與總金額。
2. THE Frontend SHALL 在訂單確認頁顯示提示訊息，告知確認信已寄至 Guest 的 Email 地址。
3. THE Frontend SHALL 在訂單確認頁提供「返回首頁」按鈕。

---

### 需求 7：訂單查詢與退款申請

**User Story：** 身為旅客，我希望能查詢我的訂單狀態並在符合條件時申請退款，以便管理我的預訂。

#### 驗收標準

1. THE Frontend SHALL 在訂單查詢頁提供 Email 與訂單編號的輸入欄位。
2. WHEN Guest 輸入正確的 Email 與訂單編號，THE Frontend SHALL 顯示訂單狀態（待確認 / 已確認 / 已取消 / 已退款）。
3. IF Guest 輸入的 Email 或訂單編號不符合任何訂單，THEN THE Frontend SHALL 顯示「查無訂單」的提示訊息。
4. WHILE 訂單在退款期限內且狀態為 `confirmed`，THE Frontend SHALL 顯示「申請退款」按鈕。
5. WHEN Guest 點擊「申請退款」並確認，THE Frontend SHALL 通知管理員進行退款審核。

---

### 需求 8：iCal 同步

**User Story：** 身為業者，我希望系統能自動同步各民宿在 Airbnb 與 Booking.com 的已訂日期，以避免雙重預訂。

#### 驗收標準

1. THE System SHALL 每小時透過 Azure Functions Timer Trigger 呼叫 Supabase Edge Function `/functions/v1/ical/sync`，同步所有 Property 的 iCal feed。
2. WHEN iCal 同步執行，THE Backend SHALL 解析各 Property 的 `ical_url` 所指向的 iCal feed 中的 VEVENT，並將佔用日期 upsert 至 `blocked_dates` 資料表。
3. WHEN iCal 同步完成，THE Backend SHALL 更新對應 Property 的最後同步時間。
4. IF iCal feed 無法存取或解析失敗，THEN THE Backend SHALL 記錄錯誤訊息並在後台 iCal 同步管理頁顯示錯誤狀態。
5. THE Admin_Dashboard SHALL 在 iCal 同步管理頁顯示每間 Property 的 iCal URL、最後同步時間與同步狀態。
6. WHEN Admin 點擊手動同步按鈕，THE Admin_Dashboard SHALL 觸發單間或全部 Property 的 iCal 同步。

---

### 需求 9：後台管理 — 訂單管理

**User Story：** 身為業者，我希望能在後台管理所有訂單並執行退款操作，以便有效處理旅客的預訂事務。

#### 驗收標準

1. WHILE Admin 已通過 Supabase Auth 驗證，THE Admin_Dashboard SHALL 顯示所有訂單的列表，支援依狀態篩選（全部 / 待確認 / 已確認 / 已取消 / 已退款）與關鍵字搜尋。
2. WHEN Admin 選擇一筆狀態為 `confirmed` 的訂單並點擊退款，THE Admin_Dashboard SHALL 要求 Admin 確認退款操作。
3. WHEN Admin 確認退款，THE Backend SHALL 呼叫 `/functions/v1/paypal/refund`（帶入 `paypal_capture_id`）向 PayPal 執行退款。
4. WHEN PayPal 退款成功，THE Backend SHALL 將訂單狀態更新為 `refunded` 並寄送退款通知 Email 至 Guest。
5. IF PayPal 退款失敗，THEN THE Admin_Dashboard SHALL 顯示退款失敗的錯誤訊息。

---

### 需求 10：後台管理 — 民宿與房型管理

**User Story：** 身為業者，我希望能在後台新增、編輯與停用民宿及房型資料，以便維護最新的住宿資訊。

#### 驗收標準

1. WHILE Admin 已通過 Supabase Auth 驗證，THE Admin_Dashboard SHALL 提供民宿的新增、編輯與停用功能。
2. THE Admin_Dashboard SHALL 提供房型的新增、編輯與停用功能，並關聯至對應的 Property。
3. THE Admin_Dashboard SHALL 提供地圖座標設定功能，允許 Admin 透過點擊地圖選取 Property 的 `lat` 與 `lng`。
4. THE Admin_Dashboard SHALL 提供早餐選項管理功能，允許 Admin 針對特定 Property 開啟或關閉 `has_breakfast_option`。
5. THE Admin_Dashboard SHALL 支援透過 Supabase Storage 上傳民宿與房型的圖片。

---

### 需求 11：Azure 費用監控

**User Story：** 身為業者，我希望能在後台直接查看 Azure 的費用資訊與警示，而不需要登入 Azure Portal。

#### 驗收標準

1. THE System SHALL 每日透過 Azure Functions Timer Trigger 呼叫 Azure Cost Management REST API，並將費用資料寫入 Supabase `azure_cost_snapshots` 資料表。
2. THE Admin_Dashboard SHALL 在費用監控頁顯示本月累計費用、上月費用與預估月底費用的總覽卡片。
3. THE Admin_Dashboard SHALL 以圓餅圖或長條圖顯示依服務（Static Web Apps / Functions / Blob Storage 等）拆分的費用分類。
4. THE Admin_Dashboard SHALL 以折線圖顯示依日或週的費用趨勢。
5. THE Admin_Dashboard SHALL 顯示資源費用明細表，列出各資源名稱與費用，支援排序。
6. THE Admin_Dashboard SHALL 顯示預算警示進度條，依消費比例以綠色（低於 50%）、黃色（50%~80%）、紅色（超過 80%）標示。
7. WHEN Azure Monitor 偵測到費用超過閾值（$50 / $100 / $200），THE System SHALL 透過 Azure Logic Apps 寄送 Email 通知給 Admin，並將警示紀錄寫入 Supabase `azure_alerts` 資料表。
8. THE Admin_Dashboard SHALL 顯示警示紀錄列表，包含觸發時間、閾值與實際費用。
9. THE Admin_Dashboard SHALL 顯示本週與上週費用比較，標示增減百分比與趨勢方向。

---

### 需求 12：AI 聊天機器人

**User Story：** 身為旅客，我希望能透過 AI 聊天機器人快速獲得民宿相關問題的解答，以便做出預訂決策。

#### 驗收標準

1. THE Frontend SHALL 在所有前台頁面的右下角顯示固定漂浮的 Chatbot 圓形按鈕。
2. WHEN Guest 點擊 Chatbot 按鈕，THE Frontend SHALL 展開對話視窗。
3. WHEN Guest 傳送訊息，THE Backend SHALL 呼叫 Supabase Edge Function `/functions/v1/chat`，由 LLM API（OpenAI GPT 或 Google Gemini）生成回覆。
4. THE Chatbot SHALL 依目前語系（zh-TW / en / ja）自動切換回覆語言。
5. THE Backend SHALL 將每次對話的 `session_id`、`role`、`content` 與 `tokens_used` 寫入 `chat_logs` 資料表。
6. THE Frontend SHALL 將對話歷史暫存於 `sessionStorage`，使 Guest 在同一瀏覽器工作階段內可查看歷史對話。

---

### 需求 13：LLM 用量追蹤

**User Story：** 身為業者，我希望能在後台監控 AI 聊天機器人的 API 用量與費用，以便控制營運成本。

#### 驗收標準

1. WHEN Chatbot Edge Function 完成一次 LLM API 呼叫，THE Backend SHALL 將 `provider`、`model`、`tokens_input`、`tokens_output` 與 `cost_usd` 寫入 `llm_usage_snapshots` 資料表。
2. THE Admin_Dashboard SHALL 在 AI 機器人管理頁顯示本月 token 用量、累計費用（USD）與每日用量折線圖。
3. THE Admin_Dashboard SHALL 顯示目前使用的 LLM provider 與 API Key 狀態（有效 / 即將到期）。
4. THE Admin_Dashboard SHALL 提供對話紀錄查詢功能，允許 Admin 搜尋旅客與機器人的對話內容。
5. THE Admin_Dashboard SHALL 提供 LLM 月費上限設定，WHEN 累計費用超過設定上限，THE System SHALL 通知 Admin。

---

### 需求 14：多語系支援

**User Story：** 身為旅客，我希望能以繁體中文、英文或日文瀏覽網站，以便使用我熟悉的語言完成預訂。

#### 驗收標準

1. THE System SHALL 支援繁體中文（zh-TW）、英文（en）與日文（ja）三種語系，預設語系為繁體中文。
2. THE Navbar SHALL 在右上角提供語言切換下拉選單，供 Guest 選擇語系。
3. WHEN Guest 切換語系，THE Frontend SHALL 立即更新所有頁面文字為對應語系，並將選擇儲存至 `localStorage`。
4. THE i18n SHALL 依語系調整日期顯示格式（zh-TW: YYYY/MM/DD、en: MM/DD/YYYY、ja: YYYY年MM月DD日）。
5. THE Frontend SHALL 統一以 TWD 顯示貨幣，並依語系調整金額格式。
6. THE Chatbot SHALL 依目前語系自動切換對話語言，無需 Guest 額外設定。

---

### 需求 15：響應式設計與 SEO

**User Story：** 身為旅客，我希望能在手機、平板與桌機上流暢使用網站，並能透過搜尋引擎找到民宿資訊。

#### 驗收標準

1. THE Frontend SHALL 完整支援手機、平板與桌機的響應式佈局（RWD）。
2. THE Frontend SHALL 為每個頁面設定獨立的 `<title>` 與 meta description。
3. THE Frontend SHALL 為所有圖片提供 `alt` 文字描述。
4. THE Frontend SHALL 確保所有表單欄位與按鈕可透過鍵盤操作。
