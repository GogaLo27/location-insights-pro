import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      user_id, 
      subscription_id, 
      payment_method, 
      transaction_id,
      amount_cents, 
      plan_type,
      billing_period_start,
      billing_period_end
    } = body;

    console.log('📄 Generating invoice for:', { user_id, subscription_id, plan_type });

    // Get user details
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name, company_name')
      .eq('id', user_id)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Generate invoice number
    const { data: invoiceNumberData } = await supabase
      .rpc('generate_invoice_number');
    
    const invoiceNumber = invoiceNumberData || `INV-${Date.now()}`;

    // Get plan name
    const planNames: any = {
      'starter': 'Starter Plan',
      'professional': 'Professional Plan',
      'enterprise': 'Enterprise Plan'
    };

    // Create invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id,
        subscription_id,
        invoice_number: invoiceNumber,
        paypal_transaction_id: payment_method === 'paypal' ? transaction_id : null,
        lemonsqueezy_order_id: payment_method === 'lemonsqueezy' ? transaction_id : null,
        payment_method,
        amount_cents,
        currency: 'USD',
        status: 'paid',
        plan_type,
        plan_name: planNames[plan_type] || plan_type,
        invoice_date: new Date().toISOString(),
        paid_date: new Date().toISOString(),
        customer_email: userProfile.email,
        customer_name: userProfile.full_name,
        customer_company: userProfile.company_name,
        billing_period_start,
        billing_period_end
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      throw invoiceError;
    }

    console.log('✅ Invoice created:', invoice.invoice_number);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Invoice generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

