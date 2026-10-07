-- AI RAG: pgvector document chunks (MANUAL APPLY).
-- 1) Bật extension vector trên Supabase trước: Dashboard > Database > Extensions > vector.
-- 2) Chạy file này bằng psql / Supabase SQL Editor (dùng DIRECT connection, không qua pooler).
-- 3) Idempotent: chạy lại an toàn.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "document_chunks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "doc_type" VARCHAR(20) NOT NULL,
  "doc_id" VARCHAR(280) NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- Cột embedding quản lý ngoài Prisma (kiểu vector Prisma chưa hỗ trợ).
ALTER TABLE "document_chunks" ADD COLUMN IF NOT EXISTS "embedding" vector(768);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_chunks_docType_docId_key'
  ) THEN
    ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_docType_docId_key" UNIQUE ("doc_type", "doc_id");
  END IF;
END $$;

-- HNSW cosine index (cần đủ dữ liệu để build hiệu quả; với <10k rows vẫn chạy đúng).
DROP INDEX IF EXISTS "document_chunks_embedding_idx";
CREATE INDEX "document_chunks_embedding_idx"
  ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);
