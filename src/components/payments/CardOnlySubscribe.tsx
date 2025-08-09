/* src/components/payments/CardOnlySubscribe.tsx */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

declare global { interface Window { paypal?: any } }

type Props = {
  planType: "starter" | "professional" | "enterprise";
  onDone?: () => void;
};

const SDK_URL = (clientId: string) =>
  `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
    clientId
  )}&components=card-fields&vault=true&intent=subscription`;

async function loadSdk(clientId: string) {
  if (window.paypal) return window.paypal;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL(clientId);
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load PayPal SDK"));
    document.head.appendChild(s);
  });
  return window.paypal;
}

export default function CardOnlySubscribe({ planType }: Props) {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numberRef = useRef<HTMLDivElement>(null);
  const expiryRef = useRef<HTMLDivElement>(null);
  const cvvRef = useRef<HTMLDivElement>(null);
  const [cardFields, setCardFields] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string;
        if (!clientId) throw new Error("Missing VITE_PAYPAL_CLIENT_ID");

        const paypal = await loadSdk(clientId);

        // 1) Ask server for a SETUP TOKEN
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token ?? "";

        const st = await supabase.functions.invoke("paypal-create-subscription", {
          body: { action: "create_setup_token", plan_type: planType },
          headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
        });
        if (st.error) throw new Error(st.error.message || "create_setup_token failed");
        const { setup_token } = typeof st.data === "string" ? JSON.parse(st.data) : st.data;
        if (!setup_token) throw new Error("No setup_token returned");

        // 2) Render Card Fields. The submit() will update that setup token.
        const cf = paypal.CardFields({
          createVaultSetupToken: async () => setup_token,
          onApprove: async (payload: any) => {
            try {
              setSubmitting(true);
              const vaultSetupToken = payload?.vaultSetupToken;
              if (!vaultSetupToken) throw new Error("Missing vaultSetupToken");

              // 3) Exchange SETUP TOKEN -> PAYMENT TOKEN (server)
              const ex = await supabase.functions.invoke("paypal-create-subscription", {
                body: { action: "exchange_setup_token", setup_token: vaultSetupToken },
                headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
              });
              if (ex.error) throw new Error(ex.error.message || "exchange_setup_token failed");
              const { payment_token } = typeof ex.data === "string" ? JSON.parse(ex.data) : ex.data;
              if (!payment_token) throw new Error("No payment_token returned");

              // 4) Create subscription with the PAYMENT TOKEN (server)
              const mk = await supabase.functions.invoke("paypal-create-subscription", {
                body: {
                  action: "create_subscription_with_token",
                  plan_type: planType,
                  payment_token,
                },
                headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
              });
              if (mk.error) throw new Error(mk.error.message || "create_subscription_with_token failed");
              const payload2 = typeof mk.data === "string" ? JSON.parse(mk.data) : mk.data;

              if (payload2?.subscription_id) {
                localStorage.setItem("pendingSubId", payload2.subscription_id);
              }
              window.location.href = "/billing/success";
            } catch (e: any) {
              setError(e.message || "Subscription creation failed");
              setSubmitting(false);
            }
          },
          onError: (err: any) => {
            setError(err?.message || "Card fields error");
            setSubmitting(false);
          },
        });

        await cf.NumberField().render(numberRef.current!);
        await cf.ExpiryField().render(expiryRef.current!);
        await cf.CVVField().render(cvvRef.current!);

        if (!mounted) return;
        setCardFields(cf);
        setReady(true);
      } catch (e: any) {
        setError(e.message || "Failed to initialize card checkout");
      }
    })();

    return () => { mounted = false; };
  }, [planType]);

  const onSubmit = async () => {
    if (!cardFields) return;
    setError(null);
    setSubmitting(true);
    try { await cardFields.submit(); }
    catch (e: any) {
      setError(e?.message || "Card submit failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8 border rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-2">Pay by card</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Secure card entry powered by PayPal. No PayPal login required.
      </p>

      <div className="space-y-3">
        <div className="border rounded-lg p-3">
          <label className="text-xs block mb-1">Card number</label>
          <div ref={numberRef} className="h-10" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded-lg p-3">
            <label className="text-xs block mb-1">Expiry</label>
            <div ref={expiryRef} className="h-10" />
          </div>
          <div className="border rounded-lg p-3">
            <label className="text-xs block mb-1">CVV</label>
            <div ref={cvvRef} className="h-10" />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}

      <div className="mt-5">
        <Button className="w-full" disabled={!ready || submitting} onClick={onSubmit}>
          {submitting ? "Processing…" : "Start subscription"}
        </Button>
      </div>
    </div>
  );
}
