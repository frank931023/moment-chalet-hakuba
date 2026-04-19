# Moment Chalet Hakuba — Azure Functions

兩個 Timer Trigger Azure Functions，負責 iCal 同步與 Azure 費用快照。

## 函式說明

| 函式 | 觸發時間 | 說明 |
|------|---------|------|
| `ical-sync` | 每小時（`0 * * * *`） | 呼叫 Supabase Edge Function 同步所有民宿的 iCal feed |
| `cost-snapshot` | 每日 02:00 UTC（`0 2 * * *`） | 查詢 Azure Cost Management API，將當月費用寫入 Supabase |

## 本地開發

### 前置需求

- Node.js 18+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
- [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite)（本地 Storage 模擬器）

### 安裝依賴

```bash
cd azure-functions
npm install
```

### 設定環境變數

複製範例設定檔並填入實際值：

```bash
cp local.settings.json.example local.settings.json
```

編輯 `local.settings.json`，填入以下必要變數：

| 變數 | 說明 |
|------|------|
| `SUPABASE_URL` | Supabase 專案 URL（例：`https://xxx.supabase.co`） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key（後台管理用） |
| `AZURE_SUBSCRIPTION_ID` | Azure 訂閱 ID |
| `AZURE_TENANT_ID` | Azure AD Tenant ID（Service Principal 認證用） |
| `AZURE_CLIENT_ID` | Service Principal Client ID |
| `AZURE_CLIENT_SECRET` | Service Principal Client Secret |
| `AZURE_COST_API_TOKEN` | 或直接提供 Bearer Token（替代 SP 認證） |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Application Insights 連線字串 |

### 啟動本地執行

```bash
# 先啟動 Azurite（另開終端機）
npx azurite --silent

# 啟動 Functions
npm start
```

## 部署至 Azure

### 1. 建立 Azure 資源

```bash
# 建立 Resource Group
az group create --name rg-moment-chalet --location japaneast

# 建立 Storage Account（Functions 需要）
az storage account create \
  --name stmomentchalet \
  --resource-group rg-moment-chalet \
  --location japaneast \
  --sku Standard_LRS

# 建立 Function App（Consumption Plan，Node.js 18）
az functionapp create \
  --resource-group rg-moment-chalet \
  --consumption-plan-location japaneast \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name func-moment-chalet \
  --storage-account stmomentchalet \
  --os-type Linux
```

### 2. 設定環境變數

```bash
az functionapp config appsettings set \
  --name func-moment-chalet \
  --resource-group rg-moment-chalet \
  --settings \
    "SUPABASE_URL=https://xxx.supabase.co" \
    "SUPABASE_SERVICE_ROLE_KEY=<key>" \
    "AZURE_SUBSCRIPTION_ID=<sub-id>" \
    "AZURE_TENANT_ID=<tenant-id>" \
    "AZURE_CLIENT_ID=<client-id>" \
    "AZURE_CLIENT_SECRET=<secret>"
```

建議將敏感金鑰存入 **Azure Key Vault**，並透過 Key Vault Reference 引用：

```
@Microsoft.KeyVault(SecretUri=https://kv-moment-chalet.vault.azure.net/secrets/SupabaseServiceRoleKey/)
```

### 3. 部署程式碼

```bash
cd azure-functions
npm run build
func azure functionapp publish func-moment-chalet
```

或透過 GitHub Actions 自動部署（參考 `.github/workflows/`）。

### 4. 設定 Service Principal（Cost Management 存取）

```bash
# 建立 Service Principal
az ad sp create-for-rbac \
  --name sp-moment-chalet-cost \
  --role "Cost Management Reader" \
  --scopes /subscriptions/<subscription-id>

# 輸出的 appId → AZURE_CLIENT_ID
# 輸出的 password → AZURE_CLIENT_SECRET
# 輸出的 tenant → AZURE_TENANT_ID
```

## 監控

- 執行記錄可在 **Azure Portal → Function App → Monitor** 查看
- 設定 Application Insights 後可查看詳細 trace 與錯誤
- 建議設定 Azure Monitor 警示，當函式連續失敗時發送通知
