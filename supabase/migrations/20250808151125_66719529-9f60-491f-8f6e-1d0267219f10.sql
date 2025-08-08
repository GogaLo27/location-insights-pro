-- Deduplicate user_plans and add unique constraint on user_id
WITH ranked AS (
  SELECT id, user_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.user_plans
)
DELETE FROM public.user_plans up
USING ranked r
WHERE up.id = r.id AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_plans_user_id_key'
  ) THEN
    ALTER TABLE public.user_plans
    ADD CONSTRAINT user_plans_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Ensure only one default selected location per user
WITH ranked_loc AS (
  SELECT id, user_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.user_selected_locations
)
DELETE FROM public.user_selected_locations u
USING ranked_loc r
WHERE u.id = r.id AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_selected_locations_user_id_key'
  ) THEN
    ALTER TABLE public.user_selected_locations
    ADD CONSTRAINT user_selected_locations_user_id_key UNIQUE (user_id);
  END IF;
END $$;