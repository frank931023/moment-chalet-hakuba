-- Migration: 002_auxiliary_tables.sql
-- 建立輔助資料表：chat_logs, llm_usage_snapshots

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

ALTER TABLE llm_usage_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read llm_usage_snapshots" ON llm_usage_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');
