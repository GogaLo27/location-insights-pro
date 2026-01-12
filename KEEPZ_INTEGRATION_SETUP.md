# Keepz Payment Integration Setup Guide

## Overview
This document provides step-by-step instructions for deploying the Keepz payment integration.

**Architecture**: Users must save a card first, then use saved cards for subscriptions.

## Prerequisites
- Supabase CLI installed and logged in
- Keepz integration credentials (Integrator ID, Receiver ID, Public Key, Private Key)

## Environment Variables / Supabase Secrets

### Required Secrets
Set these in Supabase using the CLI:

```bash
# Navigate to client folder
cd client

# Set Keepz secrets
npx supabase secrets set KEEPZ_INTEGRATOR_ID="7609ba19-0e88-49a8-b85f-28c41eea103f"
npx supabase secrets set KEEPZ_RECEIVER_ID="fb84a475-eb57-4d07-967b-73073d4a5b30"
npx supabase secrets set KEEPZ_PUBLIC_KEY="YOUR_PUBLIC_KEY_HERE"
npx supabase secrets set KEEPZ_PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE"
npx supabase secrets set KEEPZ_MODE="dev"  # Use "live" for production
```

### Keys Format
- **Public Key**: Should be Base64 encoded SPKI format (starts with `MIICIjAN...`)
- **Private Key**: Should be Base64 encoded PKCS8 format

## Deploy Edge Functions

```bash
cd client

# Deploy all Keepz functions
npx supabase functions deploy keepz-save-card
npx supabase functions deploy keepz-charge-saved-card
npx supabase functions deploy keepz-webhook
npx supabase functions deploy keepz-cancel-subscription
```

## Database Migration

Run these SQL commands in Supabase SQL Editor:

### 1. Add Keepz columns to subscriptions table
```sql
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS keepz_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS keepz_order_id TEXT,
ADD COLUMN IF NOT EXISTS keepz_card_token TEXT;
```

### 2. Create user_payment_methods table
```sql
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'keepz',
  card_token TEXT NOT NULL,
  card_mask TEXT,
  card_brand TEXT,
  last_4_digits TEXT,
  expiration_date TEXT,
  is_default BOOLEAN DEFAULT false,
  nickname TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, card_token)
);

ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment methods" 
ON public.user_payment_methods FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" 
ON public.user_payment_methods FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" 
ON public.user_payment_methods FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" 
ON public.user_payment_methods FOR DELETE 
USING (auth.uid() = user_id);

CREATE INDEX idx_payment_methods_user_id ON public.user_payment_methods(user_id);
```

## Webhook Configuration

Configure your Keepz integration callback URL:
```
https://maxpyehrsnrcfriukuvv.supabase.co/functions/v1/keepz-webhook
```

## Payment Flow

### Step 1: User Saves Card
1. User goes to `/payment-methods`
2. Clicks "Add New Card"
3. Redirected to Keepz (1 GEL authorization)
4. Card saved to `user_payment_methods` table

### Step 2: User Subscribes
1. User goes to `/checkout?plan=professional`
2. Selects saved card from dropdown
3. Clicks "Pay"
4. `keepz-charge-saved-card` charges the actual amount
5. Subscription created

## Testing

1. Go to `/payment-methods` and add a card
2. Go to `/checkout?plan=professional`
3. Select your saved card
4. Complete the payment
5. Check logs at: https://supabase.com/dashboard/project/maxpyehrsnrcfriukuvv/functions

## Encryption

The integration uses hybrid encryption (AES-256-CBC + RSA):
- Payload is encrypted with AES-256-CBC using a random key/IV
- The AES key and IV are encrypted with RSA
- Supports both PKCS1 and OAEP padding modes

## Troubleshooting

### "Failed to decrypt data"
- Check that you're using the correct public key (Keepz's public key for encryption)
- Verify the padding mode matches what Keepz configured for your integration

### "You do not have permission for subscription"
- Contact Keepz to enable subscription permissions for your integration

### "Currency not allowed"
- Check which currencies are enabled for your integration (GEL, EUR, USD, etc.)

## Files

### Edge Functions
- `supabase/functions/keepz-save-card/index.ts` - Saves card (1 GEL auth)
- `supabase/functions/keepz-charge-saved-card/index.ts` - Charges saved card for subscription
- `supabase/functions/keepz-webhook/index.ts` - Handles callbacks from Keepz
- `supabase/functions/keepz-cancel-subscription/index.ts` - Cancels subscriptions

### Frontend Pages
- `src/pages/PaymentMethods.tsx` - Manage saved cards
- `src/pages/Checkout.tsx` - Checkout with saved card selection

## Security

We only store:
- `card_token` - UUID reference to card in Keepz system
- `card_mask` - Masked card number (411111******1111)
- `card_brand` - VISA, MasterCard, etc.
- `expiration_date` - MM/YY

We NEVER store:
- Full card number
- CVV/CVC
- PIN
