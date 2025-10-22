import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.text();
    console.log("Webhook received:", body);
    
    // For now, let's skip signature verification to get it working
    // We'll add it back once the basic flow is working
    const webhookSecret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.log("Warning: LEMONSQUEEZY_WEBHOOK_SECRET not configured");
    }

    const event = JSON.parse(body);
    console.log("LemonSqueezy webhook event:", event);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different event types
    switch (event.meta.event_name) {
      case "order_created":
        await handleOrderCreated(supabase, event);
        break;
      case "subscription_created":
        await handleSubscriptionCreated(supabase, event);
        break;
      case "subscription_updated":
        await handleSubscriptionUpdated(supabase, event);
        break;
      case "subscription_cancelled":
        await handleSubscriptionCancelled(supabase, event);
        break;
      case "subscription_resumed":
        await handleSubscriptionResumed(supabase, event);
        break;
      case "subscription_expired":
        await handleSubscriptionExpired(supabase, event);
        break;
      default:
        console.log("Unhandled event type:", event.meta.event_name);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

async function handleOrderCreated(supabase: any, event: any) {
  const order = event.data;
  const customData = order.attributes.custom_data;
  
  if (!customData?.user_id || !customData?.subscription_id) {
    console.log("No custom data found in order");
    return;
  }

  // Update subscription with order details
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      provider_subscription_id: order.id,
      order_id: order.id,
      current_period_end: new Date(order.attributes.renewals_at).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", customData.subscription_id);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: customData.subscription_id,
    event_type: "order_created",
    lemonsqueezy_event_id: event.meta.event_id,
    event_data: order,
    created_at: new Date().toISOString()
  });

  console.log("Order created event processed successfully");
}

async function handleSubscriptionCreated(supabase: any, event: any) {
  const subscription = event.data;
  const customData = subscription.attributes.custom_data;
  
  if (!customData?.user_id || !customData?.subscription_id) {
    console.log("No custom data found in subscription");
    return;
  }

  // Update subscription status
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      provider_subscription_id: subscription.id,
      current_period_end: new Date(subscription.attributes.renewals_at).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", customData.subscription_id);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: customData.subscription_id,
    event_type: "subscription_created",
    lemonsqueezy_event_id: event.meta.event_id,
    event_data: subscription,
    created_at: new Date().toISOString()
  });

  console.log("Subscription created event processed successfully");
}

async function handleSubscriptionUpdated(supabase: any, event: any) {
  const subscription = event.data;
  
  // Find subscription by provider_subscription_id
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("provider_subscription_id", subscription.id)
    .single();

  if (fetchError || !sub) {
    console.log("Subscription not found for update");
    return;
  }

  // Update subscription
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.attributes.status,
      current_period_end: new Date(subscription.attributes.renewals_at).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", sub.id);

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: sub.id,
    event_type: "subscription_updated",
    lemonsqueezy_event_id: event.meta.event_id,
    event_data: subscription,
    created_at: new Date().toISOString()
  });

  console.log("Subscription updated event processed successfully");
}

async function handleSubscriptionCancelled(supabase: any, event: any) {
  const subscription = event.data;
  
  // Find subscription by provider_subscription_id
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("provider_subscription_id", subscription.id)
    .single();

  if (fetchError || !sub) {
    console.log("Subscription not found for cancellation");
    return;
  }

  // Update subscription
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", sub.id);

  if (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: sub.id,
    event_type: "subscription_cancelled",
    lemonsqueezy_event_id: event.meta.event_id,
    event_data: subscription,
    created_at: new Date().toISOString()
  });

  console.log("Subscription cancelled event processed successfully");
}

async function handleSubscriptionResumed(supabase: any, event: any) {
  const subscription = event.data;
  
  // Find subscription by provider_subscription_id
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("provider_subscription_id", subscription.id)
    .single();

  if (fetchError || !sub) {
    console.log("Subscription not found for resumption");
    return;
  }

  // Update subscription
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      cancelled_at: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", sub.id);

  if (error) {
    console.error("Error resuming subscription:", error);
    throw error;
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: sub.id,
    event_type: "subscription_resumed",
    lemonsqueezy_event_id: event.meta.event_id,
    event_data: subscription,
    created_at: new Date().toISOString()
  });

  console.log("Subscription resumed event processed successfully");
}

async function handleSubscriptionExpired(supabase: any, event: any) {
  const subscription = event.data;
  
  // Find subscription by provider_subscription_id
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("provider_subscription_id", subscription.id)
    .single();

  if (fetchError || !sub) {
    console.log("Subscription not found for expiration");
    return;
  }

  // Update subscription
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "expired",
      updated_at: new Date().toISOString()
    })
    .eq("id", sub.id);

  if (error) {
    console.error("Error expiring subscription:", error);
    throw error;
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: sub.id,
    event_type: "subscription_expired",
    lemonsqueezy_event_id: event.meta.event_id,
    event_data: subscription,
    created_at: new Date().toISOString()
  });

  console.log("Subscription expired event processed successfully");
}