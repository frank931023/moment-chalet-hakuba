-- Migration: 002_auxiliary_tables.sql
-- 建立輔助資料表：chat_logs, llm_usage_snapshots, azure_cost_snapshots, azure_alerts

-- ============================================================
-- chat_logs（對話紀錄）
-- ============================================================
CREATE TABLE chat_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_logs_session ON chat_logs(session_id);

-- RLS
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read chat_logs" ON chat_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- llm_usage_snapshots（LLM 用量快照）
-- ============================================================
CREATE TABLE llm_usage_snapshots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       TEXT NOT NULL,   -- openai | gemini
  model          TEXT NOT NULL,   -- gpt-4o | gemini-pro
  tokens_input   INT NOT NULL DEFAULT 0,
  tokens_output  INT NOT NULL DEFAULT 0,
  cost_usd       NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- azure_cost_snapshots（Azure 費用快照）
-- ============================================================
CREATE TABLE azure_cost_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  service_name  TEXT NOT NULL,
  resource_name TEXT,
  cost_usd      NUMERIC(10, 4) NOT NULL DEFAULT 0,
  cost_twd      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  period        TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_snapshots_date ON azure_cost_snapshots(snapshot_date);

-- ============================================================
-- azure_alerts（Azure 費用警示）
-- ============================================================
CREATE TABLE azure_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  threshold_usd   NUMERIC(10, 2) NOT NULL,
  actual_cost_usd NUMERIC(10, 2) NOT NULL,
  message         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
