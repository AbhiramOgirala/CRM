-- -----------------------------------------------------------------------------
-- IMPORTANT: IGNORE VS CODE "SYNTAX ERRORS"
-- -----------------------------------------------------------------------------
-- This file uses PostgreSQL syntax (for Supabase).
-- If your VS Code is set to validate for MSSQL (SQL Server), it will show red 
-- squiggles (e.g., matching "IF NOT EXISTS", "TEXT" as PKey).
-- These are FALSE POSITIVES. The code is valid for Supabase.
-- ----------------------------------------------------------------------------- 

-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor)

DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

CREATE TABLE public.push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    expiration_time TEXT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
