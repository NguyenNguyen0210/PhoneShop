-- AI conversation memory (MANUAL APPLY).
-- Chạy bằng psql / Supabase SQL Editor (direct connection). Idempotent.

CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "session_key" VARCHAR(100) NOT NULL,
  "summary" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_conversations_session_key_idx" ON "ai_conversations" ("session_key");

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "ai_conversations" ("id") ON DELETE CASCADE,
  "role" VARCHAR(20) NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_messages_conversation_id_idx" ON "ai_messages" ("conversation_id");
