import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const sb: any = supabase;

function getQueryParam(name: string) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) || undefined;
}

export default function BillingSuccess() {
  const [status, setStatus] = useState("Checking your subscription…");

  useEffect(() => {
    const localId = localStorage.getItem("pendingSubId") || undefined;
    const providerId = getQueryParam("subscription_id"); // from PayPal redirect
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      tries++;

      // Prefer local id (our DB id). If not, try to find by provider id.
      let subRow: any = null;
      if (localId) {
        const { data } = await sb
          .from("subscriptions")
          .select("id,status,provider_subscription_id")
          .eq("id", localId)
          .single();
        subRow = data;
      } else if (providerId) {
        const { data } = await sb
          .from("subscriptions")
          .select("id,status,provider_subscription_id")
          .eq("provider_subscription_id", providerId)
          .maybeSingle();
        subRow = data;
      }

      if (subRow?.status === "active") {
        setStatus("Subscription active! Redirecting to dashboard…");
        localStorage.removeItem("pendingSubId");
        setTimeout(() => { window.location.href = "/dashboard"; }, 1000);
        return;
      }

      // Every 3rd attempt, ask the server to sync from PayPal (fallback)
      if ((tries % 3 === 0) && (localId || providerId)) {
        const { data: session } = await supabase.auth.getSession();
        const jwt = session.session?.access_token || "";
        await supabase.functions.invoke("paypal-sync-subscription", {
          body: {
            local_subscription_id: localId,
            provider_subscription_id: providerId,
          },
          headers: { Authorization: `Bearer ${jwt}` },
        });
      }

      setStatus(`Current status: ${subRow?.status || "pending"}. Waiting…`);
      timer = setTimeout(poll, 2000);
    }

    poll();
    return () => clearTimeout(timer);
  }, []);

  return <div className="p-8 text-lg">{status}</div>;
}
