# Keepz Payment Integration Setup Guide

## Overview
This document provides step-by-step instructions for deploying the Keepz payment integration.

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
npx supabase functions deploy keepz-create-subscription
npx supabase functions deploy keepz-webhook
npx supabase functions deploy keepz-cancel-subscription
```

## Database Migration

Run the migration to add Keepz-specific columns:

```bash
cd client
npx supabase db push
```

Or manually run:
```sql
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS keepz_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS keepz_order_id TEXT,
ADD COLUMN IF NOT EXISTS keepz_card_token TEXT;
```

## Webhook Configuration

Configure your Keepz integration callback URL:
```
https://maxpyehrsnrcfriukuvv.supabase.co/functions/v1/keepz-webhook
```

## Testing

1. Go to `/checkout?plan=professional`
2. Select Keepz as payment method
3. Complete the payment flow
4. Check logs at: https://supabase.com/dashboard/project/maxpyehrsnrcfriukuvv/functions

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

## Files Created

- `supabase/functions/keepz-create-subscription/index.ts` - Creates payment/subscription
- `supabase/functions/keepz-webhook/index.ts` - Handles callbacks from Keepz
- `supabase/functions/keepz-cancel-subscription/index.ts` - Cancels subscriptions
- `src/pages/Checkout.tsx` - Checkout page with payment method selection

