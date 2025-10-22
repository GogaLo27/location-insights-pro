import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
)

interface LemonSqueezyCheckoutData {
  data: {
    id: string
    type: string
    attributes: {
      store_id: number
      variant_id: number
      custom_price: number | null
      product_options: any
      checkout_options: any
      checkout_data: any
      expires_at: string | null
      preview: boolean
      test_mode: boolean
      url: string
      created_at: string
      updated_at: string
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "")
    const { data: { user } } = await supabase.auth.getUser(auth || "")
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors })

    const { plan_type, return_url, cancel_url } = await req.json()

    // Get LemonSqueezy credentials
    const storeId = Deno.env.get('LEMONSQUEEZY_STORE_ID')
    const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY')
    const productIds = JSON.parse(Deno.env.get('LEMONSQUEEZY_PRODUCT_IDS') || '{}')

    if (!storeId || !apiKey || !productIds[plan_type]) {
      throw new Error("LemonSqueezy configuration missing")
    }

    const productId = productIds[plan_type]

    // Create local subscription (pending)
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .insert({ 
        user_id: user.id, 
        plan_type, 
        status: "pending",
        provider: "lemonsqueezy",
        store_id: storeId,
        product_id: productId,
        refund_eligible_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours from now
      })
      .select("*")
      .single()

    if (subErr) throw subErr

    // Create LemonSqueezy checkout
    const checkoutResponse = await fetch(`https://api.lemonsqueezy.com/v1/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json"
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user.email,
              name: user.user_metadata?.full_name || user.email,
              custom: {
                user_id: user.id,
                subscription_id: sub.id
              }
            }
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: storeId
              }
            },
            variant: {
              data: {
                type: "variants",
                id: productId
              }
            }
          }
        }
      })
    })

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text()
      console.error("LemonSqueezy checkout creation failed:", errorText)
      console.error("Request body was:", JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user.email,
              name: user.user_metadata?.full_name || user.email,
              custom: {
                user_id: user.id,
                subscription_id: sub.id
              }
            }
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: storeId
              }
            },
            variant: {
              data: {
                type: "variants",
                id: productId
              }
            }
          }
        }
      }, null, 2))
      throw new Error(`Failed to create LemonSqueezy checkout: ${errorText}`)
    }

    const checkoutData: LemonSqueezyCheckoutData = await checkoutResponse.json()

    // Log subscription creation event
    await supabase
      .from("subscription_events")
      .insert({
        subscription_id: sub.id,
        event_type: "subscription_created",
        event_data: {
          plan_type: plan_type,
          provider_subscription_id: checkoutData.data.id,
          checkout_url: checkoutData.data.attributes.url,
          created_at: new Date().toISOString()
        }
      })

    return new Response(JSON.stringify({
      success: true,
      checkout_url: checkoutData.data.attributes.url,
      subscription_id: sub.id
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error creating LemonSqueezy subscription:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create subscription" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" } 
    })
  }
})
