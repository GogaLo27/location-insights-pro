-- Deduplicate existing user_plans by keeping the most recent per user
WITH ranked AS (
  SELECT id, user_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.user_plans
)
DELETE FROM public.user_plans up
USING ranked r
WHERE up.id = r.id AND r.rn > 1;

-- Add a unique constraint to ensure one plan per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'user_plans_user_id_key'
  ) THEN
    ALTER TABLE public.user_plans
    ADD CONSTRAINT user_plans_user_id_key UNIQUE (user_id);
  END IF;
END$$;