// /src/components/payments/CardOnlySubscribe.tsx
// Renders PayPal Advanced Card Fields (no PayPal login), vaults the card, and creates the subscription.

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    paypal?: any;
  }
}

const SDK_URL = (clientId: string) =>
  `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=card-fields&vault=true&intent=subscription`;

type Props = { planType: "starter" | "professional" | "enterprise" | null };

export default function CardOnlySubscribe({ planType }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(!!window.paypal);
  const cardContainer = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<any>(null);

  useEffect(() => {
    if (window.paypal) {
      setSdkReady(true);
      return;
    }
    const cid = import.meta.env.VITE_PAYPAL_CLIENT_ID as string;
    if (!cid) {
      console.error("Missing VITE_PAYPAL_CLIENT_ID");
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL(cid);
    s.async = true;
    s.onload = () => setSdkReady(true);
    s.onerror = () => console.error("Failed to load PayPal SDK");
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!sdkReady || !cardContainer.current) return;

    const cardFields = window.paypal?.CardFields?.({
      createVaultSetupToken: async () => {
        // client creates a setup token; we *could* do it server-side too
        return undefined; // Let PayPal create it client-side
      },
      onApprove: async (payload: any) => {
        // payload.vaultSetupToken should be present
        try {
          setLoading(true);
          const { data: session } = await supabase.auth.getSession();
          const jwt = session.session?.access_token || "";

          // 1) Exchange setup token -> payment token
          const ex = await supabase.functions.invoke("paypal-create-subscription", {
            body: { action: "exchange_setup_token", vault_setup_token: payload?.vaultSetupToken },
            headers: { Authorization: `Bearer ${jwt}` },
          });
          if (ex.error) throw new Error(ex.error.message || "exchange failed");
          const payment_token = (typeof ex.data === "string" ? JSON.parse(ex.data) : ex.data)?.payment_source_token;
          if (!payment_token) throw new Error("No payment token");

          // 2) Create subscription with planType
          if (!planType) throw new Error("No plan selected");

          const sub = await supabase.functions.invoke("paypal-create-subscription", {
            body: { action: "create_subscription_with_token", plan_type: planType, payment_source_token: payment_token },
            headers: { Authorization: `Bearer ${jwt}` },
          });
          if (sub.error) throw new Error(sub.error.message || "subscription create failed");

          const payload = typeof sub.data === "string" ? JSON.parse(sub.data) : sub.data;
          if (payload?.subscription_id) {
            localStorage.setItem("pendingSubId", payload.subscription_id);
          }

          window.location.href = "/billing/success";
        } catch (e: any) {
          toast({ title: "Payment error", description: e?.message || String(e), variant: "destructive" });
          setLoading(false);
        }
      },
      onError: (err: any) => {
        toast({ title: "Payment error", description: String(err), variant: "destructive" });
      },
    });

    const number = cardFields.NumberField();
    const expiry = cardFields.ExpiryField();
    const cvv = cardFields.CVVField();

    fieldsRef.current = { number, expiry, cvv };

    number.render("#pp-card-number");
    expiry.render("#pp-card-expiry");
    cvv.render("#pp-card-cvv");

    return () => {
      try { number?.teardown?.(); } catch {}
      try { expiry?.teardown?.(); } catch {}
      try { cvv?.teardown?.(); } catch {}
    };
  }, [sdkReady]);

  return (
    <div className="space-y-4">
      <div ref={cardContainer}>
        <div id="pp-card-number" className="border rounded p-3" />
        <div className="flex gap-3 mt-3">
          <div id="pp-card-expiry" className="border rounded p-3 flex-1" />
          <div id="pp-card-cvv" className="border rounded p-3 w-40" />
        </div>
      </div>

      <Button className="w-full" disabled={!planType || loading} onClick={() => fieldsRef.current?.submit?.()}>
        {loading ? "Processing…" : "Subscribe with card"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Your card is securely vaulted by PayPal. No PayPal account required.
      </p>
    </div>
  );
}
