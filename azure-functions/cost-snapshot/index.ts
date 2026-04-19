import { app, InvocationContext, Timer } from '@azure/functions'
import { createClient } from '@supabase/supabase-js'

interface CostItem {
  serviceName: string
  resourceName: string | null
  costUsd: number
}

interface CostManagementRow {
  properties: {
    ServiceName?: string
    ResourceId?: string
    PreTaxCost?: number
    [key: string]: unknown
  }
}

interface CostManagementResponse {
  properties?: {
    rows?: unknown[][]
    columns?: Array<{ name: string; type: string }>
  }
}

// TWD/USD exchange rate (approximate; in production use a live rate API)
const TWD_PER_USD = 32

function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { startDate: fmt(startDate), endDate: fmt(endDate) }
}

async function getAzureAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    // Fall back to managed identity / pre-set token
    const token = process.env.AZURE_COST_API_TOKEN
    if (!token) throw new Error('No Azure credentials configured')
    return token
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://management.azure.com/.default',
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to get Azure access token: ${err}`)
  }

  const data = await response.json()
  return data.access_token as string
}

async function fetchCostData(
  subscriptionId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<CostItem[]> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`

  const body = {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: { from: startDate, to: endDate },
    dataset: {
      granularity: 'None',
      aggregation: {
        totalCost: { name: 'PreTaxCost', function: 'Sum' },
      },
      grouping: [
        { type: 'Dimension', name: 'ServiceName' },
        { type: 'Dimension', name: 'ResourceId' },
      ],
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Azure Cost Management API error ${response.status}: ${err}`)
  }

  const data: CostManagementResponse = await response.json()
  const rows = data.properties?.rows ?? []
  const columns = data.properties?.columns ?? []

  // Map column indices
  const colIndex = (name: string) => columns.findIndex((c) => c.name === name)
  const serviceIdx = colIndex('ServiceName')
  const resourceIdx = colIndex('ResourceId')
  const costIdx = colIndex('PreTaxCost')

  return rows.map((row) => ({
    serviceName: serviceIdx >= 0 ? String(row[serviceIdx] ?? 'Unknown') : 'Unknown',
    resourceName: resourceIdx >= 0 ? String(row[resourceIdx] ?? '') || null : null,
    costUsd: costIdx >= 0 ? Number(row[costIdx] ?? 0) : 0,
  }))
}

// Timer trigger: daily at 2am UTC
// Cron: 0 2 * * *
app.timer('cost-snapshot', {
  schedule: '0 2 * * *',
  handler: async (myTimer: Timer, context: InvocationContext): Promise<void> => {
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!subscriptionId || !supabaseUrl || !serviceRoleKey) {
      context.error(
        '[cost-snapshot] Missing required env vars: AZURE_SUBSCRIPTION_ID, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY',
      )
      return
    }

    const snapshotDate = new Date().toISOString().split('T')[0]
    context.log(`[cost-snapshot] Starting cost snapshot for ${snapshotDate}`)

    try {
      const accessToken = await getAzureAccessToken()
      const { startDate, endDate } = getCurrentMonthRange()

      context.log(`[cost-snapshot] Fetching costs for period ${startDate} to ${endDate}`)
      const costItems = await fetchCostData(subscriptionId, accessToken, startDate, endDate)
      context.log(`[cost-snapshot] Retrieved ${costItems.length} cost items`)

      const supabase = createClient(supabaseUrl, serviceRoleKey)

      const records = costItems.map((item) => ({
        snapshot_date: snapshotDate,
        service_name: item.serviceName,
        resource_name: item.resourceName,
        cost_usd: item.costUsd,
        cost_twd: Math.round(item.costUsd * TWD_PER_USD * 100) / 100,
        period: 'monthly' as const,
      }))

      if (records.length === 0) {
        context.log('[cost-snapshot] No cost data to write')
        return
      }

      const { error } = await supabase.from('azure_cost_snapshots').insert(records)

      if (error) {
        context.error(`[cost-snapshot] Failed to write to Supabase: ${error.message}`)
        return
      }

      context.log(`[cost-snapshot] Successfully wrote ${records.length} cost records to azure_cost_snapshots`)
    } catch (err) {
      context.error(
        `[cost-snapshot] Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  },
})
