# Deploy Supabase Edge Functions

**Project ID:** `maxpyehrsnrcfriukuvv`

## Deploy All Functions at Once
```bash
supabase functions deploy --project-ref maxpyehrsnrcfriukuvv
```

## Deploy Individual Functions

### Keepz Functions
```bash
supabase functions deploy keepz-charge-saved-card --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy keepz-save-card --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy keepz-webhook --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy keepz-cancel-subscription --project-ref maxpyehrsnrcfriukuvv
```

### PayPal Functions
```bash
supabase functions deploy paypal-create-subscription --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy paypal-cancel-subscription --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy paypal-refund --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy paypal-webhook --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy paypal-webhook-public --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy check-paypal-subscription --project-ref maxpyehrsnrcfriukuvv
```

### LemonSqueezy Functions
```bash
supabase functions deploy lemonsqueezy-create-subscription --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy lemonsqueezy-cancel-subscription --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy lemonsqueezy-refund --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy lemonsqueezy-webhook --project-ref maxpyehrsnrcfriukuvv
```

### User Management Functions
```bash
supabase functions deploy update-user-profile --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy update-security-settings --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy delete-user-account --project-ref maxpyehrsnrcfriukuvv
```

### Business & Analytics Functions
```bash
supabase functions deploy google-business-api --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy ai-review-analysis --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy generate-ai-reply --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy track-campaign-visit --project-ref maxpyehrsnrcfriukuvv
```

### Utility Functions
```bash
supabase functions deploy generate-invoice --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy request-refund --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy cancel-subscription --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy test-webhook --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy test-profile-table --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy fake-payment --project-ref maxpyehrsnrcfriukuvv
```

## Link Project First (Alternative Method)

If you prefer to link first, then deploy without project-ref:
```bash
# Link to project once
supabase link --project-ref maxpyehrsnrcfriukuvv

# Then deploy without project-ref flag
supabase functions deploy keepz-webhook
```

## Verify Environment Variables

```bash
# Check secrets
supabase secrets list --project-ref maxpyehrsnrcfriukuvv
```

## Bulk Deploy Script (Windows PowerShell)

Save this as `deploy-all.ps1`:
```powershell
$projectRef = "maxpyehrsnrcfriukuvv"
$functions = @(
    "keepz-charge-saved-card",
    "keepz-save-card",
    "keepz-webhook",
    "keepz-cancel-subscription",
    "paypal-create-subscription",
    "paypal-cancel-subscription",
    "paypal-refund",
    "paypal-webhook",
    "paypal-webhook-public",
    "check-paypal-subscription",
    "lemonsqueezy-create-subscription",
    "lemonsqueezy-cancel-subscription",
    "lemonsqueezy-refund",
    "lemonsqueezy-webhook",
    "update-user-profile",
    "update-security-settings",
    "delete-user-account",
    "google-business-api",
    "ai-review-analysis",
    "generate-ai-reply",
    "track-campaign-visit",
    "generate-invoice",
    "request-refund",
    "cancel-subscription",
    "test-webhook",
    "test-profile-table",
    "fake-payment"
)

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Cyan
    supabase functions deploy $func --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to deploy $func" -ForegroundColor Red
    } else {
        Write-Host "Successfully deployed $func" -ForegroundColor Green
    }
    Write-Host ""
}
```

## Bulk Deploy Script (Bash/Unix)

Save this as `deploy-all.sh`:
```bash
#!/bin/bash

PROJECT_REF="maxpyehrsnrcfriukuvv"

functions=(
    "keepz-charge-saved-card"
    "keepz-save-card"
    "keepz-webhook"
    "keepz-cancel-subscription"
    "paypal-create-subscription"
    "paypal-cancel-subscription"
    "paypal-refund"
    "paypal-webhook"
    "paypal-webhook-public"
    "check-paypal-subscription"
    "lemonsqueezy-create-subscription"
    "lemonsqueezy-cancel-subscription"
    "lemonsqueezy-refund"
    "lemonsqueezy-webhook"
    "update-user-profile"
    "update-security-settings"
    "delete-user-account"
    "google-business-api"
    "ai-review-analysis"
    "generate-ai-reply"
    "track-campaign-visit"
    "generate-invoice"
    "request-refund"
    "cancel-subscription"
    "test-webhook"
    "test-profile-table"
    "fake-payment"
)

for func in "${functions[@]}"; do
    echo "Deploying $func..."
    supabase functions deploy "$func" --project-ref "$PROJECT_REF"
    if [ $? -eq 0 ]; then
        echo "✓ Successfully deployed $func"
    else
        echo "✗ Failed to deploy $func"
    fi
    echo ""
done
```

## Quick Deploy Only Keepz Functions (After OAEP Changes)

```bash
supabase functions deploy keepz-charge-saved-card --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy keepz-save-card --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy keepz-webhook --project-ref maxpyehrsnrcfriukuvv
supabase functions deploy keepz-cancel-subscription --project-ref maxpyehrsnrcfriukuvv
```

