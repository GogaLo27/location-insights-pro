-- Fix the user_plans table constraint issue
ALTER TABLE public.user_plans ADD CONSTRAINT user_plans_user_id_unique UNIQUE (user_id);