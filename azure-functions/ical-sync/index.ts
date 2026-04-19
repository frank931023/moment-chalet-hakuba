import { app, InvocationContext, Timer } from '@azure/functions'

// Timer trigger: every hour
// Cron: 0 * * * * (every hour at minute 0)
app.timer('ical-sync', {
  schedule: '0 * * * *',
  handler: async (myTimer: Timer, context: InvocationContext): Promise<void> => {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      context.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return
    }

    const syncUrl = `${supabaseUrl}/functions/v1/ical-sync`
    context.log(`[ical-sync] Starting iCal sync at ${new Date().toISOString()}`)

    try {
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ property_id: null }), // sync all properties
      })

      if (!response.ok) {
        const errorText = await response.text()
        context.error(`[ical-sync] Sync failed with status ${response.status}: ${errorText}`)
        return
      }

      const result = await response.json()
      const syncedCount = result.synced?.length ?? 0
      const errorCount = result.errors?.length ?? 0

      context.log(`[ical-sync] Sync completed. Synced: ${syncedCount}, Errors: ${errorCount}`)

      if (result.synced && result.synced.length > 0) {
        for (const item of result.synced) {
          context.log(`[ical-sync] Property ${item.property_id}: ${item.events_count} events synced`)
        }
      }

      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors) {
          context.error(`[ical-sync] Property ${err.property_id} error: ${err.error}`)
        }
      }
    } catch (err) {
      context.error(`[ical-sync] Unexpected error during sync: ${err instanceof Error ? err.message : String(err)}`)
    }
  },
})
