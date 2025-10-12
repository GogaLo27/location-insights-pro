-- Fix existing subscriptions that don't have current_period_end set
-- Run this in your Supabase SQL Editor

UPDATE subscriptions
SET 
  current_period_end = created_at::timestamptz + INTERVAL '30 days',
  cancel_at_period_end = false,
  updated_at = NOW()
WHERE 
  current_period_end IS NULL 
  AND status = 'active';

-- Verify the update
SELECT 
  user_id,
  plan_type,
  status,
  created_at,
  current_period_end,
  cancel_at_period_end
FROM subscriptions
ORDER BY created_at DESC;

