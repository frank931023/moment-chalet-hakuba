-- Migration: 003_rls_and_indexes.sql
-- 建立 RLS 政策（Row Level Security）

-- ============================================================
-- properties（民宿）：公開讀取，僅 Admin 可寫
-- ============================================================
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read properties" ON properties
  FOR SELECT USING (true);

CREATE POLICY "admin write properties" ON properties
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- room_types（房型）：公開讀取，僅 Admin 可寫
-- ============================================================
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read room_types" ON room_types
  FOR SELECT USING (true);

CREATE POLICY "admin write room_types" ON room_types
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- bookings（訂單）：僅 Admin 可讀（Edge Function 使用 service role 寫入）
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read bookings" ON bookings
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- blocked_dates（已佔用日期）：公開讀取
-- ============================================================
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read blocked_dates" ON blocked_dates
  FOR SELECT USING (true);

-- ============================================================
-- llm_usage_snapshots（LLM 用量快照）：僅 Admin 可讀
-- ============================================================
ALTER TABLE llm_usage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read llm_usage_snapshots" ON llm_usage_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- azure_cost_snapshots（Azure 費用快照）：僅 Admin 可讀
-- ============================================================
ALTER TABLE azure_cost_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read azure_cost_snapshots" ON azure_cost_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- azure_alerts（Azure 費用警示）：僅 Admin 可讀
-- ============================================================
ALTER TABLE azure_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read azure_alerts" ON azure_alerts
  FOR SELECT USING (auth.role() = 'authenticated');
