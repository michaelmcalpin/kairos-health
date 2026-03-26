DO $$ BEGIN
  CREATE TYPE "message_role" AS ENUM ('client', 'coach', 'ai_coach', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sender_role" "message_role" NOT NULL DEFAULT 'client';
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "reply_to" uuid;
