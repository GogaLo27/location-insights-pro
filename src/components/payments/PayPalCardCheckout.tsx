import { useEffect, useRef, useState } from "react";

async function fetchClientId(): Promise<string> {
  const r = await fetch("/functions/v1/paypal-public-config", { method: "GET" });
  const j = await r.json();
  if (!r.ok || !j?.client_id) throw new Error(j?.error || "Failed to load PayPal client id");
  return j.client_id as string;
}

function loadPayPal(clientId: string) {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).paypal) return resolve();
    const s = document.createElement("script");
    // disable PayPal wallet so it doesn't force login
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&components=hosted-fields&enable-funding=card&disable-funding=paypal`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("PayPal SDK load failed"));
    document.head.appendChild(s);
  });
}

type Props = {
  amount: string;            // e.g. "29.00"
  currency?: string;         // default "USD"
  reference?: string;        // e.g. "plan-starter"
  createOrderUrl?: string;   // default /functions/v1/paypal-create-order
  captureOrderUrl?: string;  // default /functions/v1/paypal-capture-order
  authToken?: string;        // Supabase session token
};

export default function PayPalCardCheckout({
  amount,
  currency = "USD",
  reference = "card-order",
  createOrderUrl = "/functions/v1/paypal-create-order",
  captureOrderUrl = "/functions/v1/paypal-capture-order",
  authToken,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "ineligible">("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const hostedRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const clientId = await fetchClientId();
        if (cancelled) return;
        await loadPayPal(clientId);
        if (cancelled) return;

        const paypal = (window as any).paypal;
        if (!paypal?.HostedFields?.isEligible?.()) {
          setStatus("ineligible");
          return;
        }

        await paypal.HostedFields.render({
          styles: {
            input: { "font-size": "16px", padding: "10px" },
            ".invalid": { color: "red" },
            ".valid": { color: "green" },
          },
          fields: {
            number:         { selector: "#card-number", placeholder: "4111 1111 1111 1111" },
            cvv:            { selector: "#cvv", placeholder: "123" },
            expirationDate: { selector: "#expiration", placeholder: "MM/YY" },
          },
          createOrder: async () => {
            const r = await fetch(createOrderUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
              },
              body: JSON.stringify({ amount, currency, reference }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || "order create failed");
            return j.id;
          },
        }).then((hf: any) => { hostedRef.current = hf; });

        setStatus("ready");
      } catch (e: any) {
        setErrMsg(e?.message || "Failed to initialize card form");
        setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [amount, currency, reference, createOrderUrl, authToken]);

  const onPay = async () => {
    if (!hostedRef.current) return;
    setSubmitting(true);
    try {
      const payload = await hostedRef.current.submit({ contingencies: ["3D_SECURE"] });
      const orderId = payload?.orderId;
      if (!orderId) throw new Error("Missing orderId");

      const r = await fetch(captureOrderUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ orderId }),
      });
      const capture = await r.json();
      if (!r.ok) throw new Error(capture?.error || "capture failed");

      alert("Payment successful");
    } catch (e: any) {
      alert(e?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return <div className="text-sm text-muted-foreground">Loading card form…</div>;
  }
  if (status === "ineligible") {
    return <div className="text-sm text-red-500">PayPal Advanced Cards isn’t enabled for this account/app.</div>;
  }
  if (status === "error") {
    return <div className="text-sm text-red-500">{errMsg}</div>;
  }

  return (
    <div className="space-y-3">
      <div id="card-number" className="border rounded p-3" />
      <div className="flex gap-3">
        <div id="expiration" className="border rounded p-3 flex-1" />
        <div id="cvv" className="border rounded p-3 w-28" />
      </div>
      <button
        onClick={onPay}
        disabled={submitting || status !== "ready"}
        className="rounded-xl px-4 py-2 border"
      >
        {submitting ? "Processing…" : `Pay ${amount} ${currency}`}
      </button>
    </div>
  );
}
