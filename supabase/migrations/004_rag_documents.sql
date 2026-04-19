-- ============================================================
-- RAG：啟用 pgvector 擴充套件
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- documents（知識庫文件）
-- ============================================================
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,                    -- 原始文字內容（chunk）
  embedding   vector(1536),                     -- OpenAI text-embedding-3-small 維度
  metadata    JSONB DEFAULT '{}',               -- 可存 source、category、locale 等
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 向量相似度索引（IVFFlat，適合中小型資料集）
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- RLS：僅 Admin 可寫，公開讀取（Edge Function 用 service role 繞過）
-- ============================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin write documents" ON documents
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- match_documents：向量相似度搜尋函式
-- ============================================================
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  id         UUID,
  title      TEXT,
  content    TEXT,
  metadata   JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
