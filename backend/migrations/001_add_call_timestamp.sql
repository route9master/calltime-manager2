-- Migration: Replace UNIQUE(user_id, phone_number, call_date) with call_timestamp-based deduplication
-- Problem: call_date was stored as DATE, truncating time info, causing multiple calls
--          to the same number on the same day to conflict and only the first to be saved.
-- Solution: Add call_timestamp TIMESTAMPTZ for exact-time deduplication.
--
-- Run this once on existing databases. Safe to inspect before running.

-- Step 1: Add call_timestamp column (nullable so existing rows aren't rejected)
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS call_timestamp TIMESTAMPTZ;

-- Step 2: Backfill existing rows from call_date (time precision is lost for historical data,
--         but existing rows already had UNIQUE(date) so no duplicate timestamps will result)
UPDATE call_logs SET call_timestamp = call_date::timestamptz WHERE call_timestamp IS NULL;

-- Step 3: Enforce NOT NULL now that every row has a value
ALTER TABLE call_logs ALTER COLUMN call_timestamp SET NOT NULL;

-- Step 4: Drop the old date-based unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'call_logs_user_id_phone_number_call_date_key'
  ) THEN
    ALTER TABLE call_logs DROP CONSTRAINT call_logs_user_id_phone_number_call_date_key;
  END IF;
END $$;

-- Step 5: Add new timestamp-based unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'call_logs_user_id_phone_number_call_timestamp_key'
  ) THEN
    ALTER TABLE call_logs ADD CONSTRAINT call_logs_user_id_phone_number_call_timestamp_key
      UNIQUE (user_id, phone_number, call_timestamp);
  END IF;
END $$;
