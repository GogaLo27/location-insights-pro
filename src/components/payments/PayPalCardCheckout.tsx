import { useEffect, useRef, useState } from "react";

function loadPayPal(clientId: string) {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).paypal) return resolve();
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&components=hosted-fields&enable-funding=card`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("PayPal SDK load failed"));
    document.head.appendChild(s);
  });
}

type Props = {
  clientId: string;          // VITE_PAYPAL_CLIENT_ID
  amount: string;            // e.g. "19.00"
  currency?: string;         // default "USD"
  reference?: string;        // optional
  createOrderUrl?: string;   // default /functions/v1/paypal-create-order
  captureOrderUrl?: string;  // default /functions/v1/paypal-capture-order
  authToken?: string;        // pass supabase auth token if you call functions directly from browser
};

export default function PayPalCardCheckout({
  clientId,
  amount,
  currency = "USD",
  reference = "card-order",
  createOrderUrl = "/functions/v1/paypal-create-order",
  captureOrderUrl = "/functions/v1/paypal-capture-order",
  authToken,
}: Props) {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hostedRef = useRef<any>(null);

  useEffect(() => {
    loadPayPal(clientId)
      .then(() => setReady(true))
      .catch((e) => console.error(e));
  }, [clientId]);

  useEffect(() => {
    if (!ready) return;
    const paypal = (window as any).paypal;

    paypal.HostedFields.render({
      styles: {
        input: { "font-size": "16px", padding: "10px" },
        ".invalid": { color: "red" },
        ".valid": { color: "green" },
      },
      fields: {
        number: { selector: "#card-number", placeholder: "4111 1111 1111 1111" },
        cvv: { selector: "#cvv", placeholder: "123" },
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
    }).then((hf: any) => {
      hostedRef.current = hf;
    }).catch((e: any) => console.error(e));
  }, [ready, amount, currency, reference, createOrderUrl, authToken]);

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

      // success — your existing paypal-webhook will also receive PAYMENT.CAPTURE.COMPLETED
      alert("Payment successful");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md space-y-3">
      <div id="card-number" className="border rounded p-3" />
      <div className="flex gap-3">
        <div id="expiration" className="border rounded p-3 flex-1" />
        <div id="cvv" className="border rounded p-3 w-28" />
      </div>
      <button
        onClick={onPay}
        disabled={!ready || submitting}
        className="rounded-xl px-4 py-2 border"
      >
        {submitting ? "Processing…" : `Pay ${amount} ${currency}`}
      </button>
    </div>
  );
}
