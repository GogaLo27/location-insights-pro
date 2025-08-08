import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function BillingSuccess() {
  const [status, setStatus] = useState("Checking your subscription…");

  useEffect(() => {
    const subId = localStorage.getItem("pendingSubId");
    let timer: any;

    async function poll() {
      if (!subId) { setStatus("No subscription id found."); return; }
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("id", subId)
        .single();
      if (error) {
        setStatus("Waiting for PayPal webhook…");
      } else if (data?.status === "active") {
        setStatus("Subscription active! Redirecting to dashboard…");
        localStorage.removeItem("pendingSubId");
        setTimeout(() => { window.location.href = "/dashboard"; }, 1200);
        return;
      } else {
        setStatus(`Current status: ${data?.status || "pending"}. Waiting…`);
      }
      timer = setTimeout(poll, 2000);
    }
    poll();
    return () => clearTimeout(timer);
  }, []);

  return <div className="p-8 text-lg">{status}</div>;
}
