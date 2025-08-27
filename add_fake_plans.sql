-- Insert fake billing plans for demo purposes
-- First, let's update the existing PayPal plans to be fake plans
UPDATE billing_plans 
SET provider = 'fake', 
    provider_plan_id = CASE 
        WHEN plan_type = 'starter' THEN 'fake-starter-plan'
        WHEN plan_type = 'professional' THEN 'fake-professional-plan'
        WHEN plan_type = 'enterprise' THEN 'fake-enterprise-plan'
    END,
    price_cents = 0,
    updated_at = NOW()
WHERE provider = 'paypal';
