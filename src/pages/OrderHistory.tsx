import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEMO_EMAIL } from "@/utils/mockData";

interface SubscriptionRow {
  id: string;
  plan_type: string;
  status: string;
  provider_subscription_id: string | null;
  created_at: string;
  updated_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

interface EventRow {
  id: string;
  event_type: string;
  created_at: string;
  subscription_id: string | null;
}

export default function OrderHistory() {
  const { user, loading: authLoading } = useAuth();
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Order History - Location Insights Pro";
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        // Demo: populate mock subscriptions and events
        if (user.email === DEMO_EMAIL) {
          if (!mounted) return;
          const now = new Date();
          const iso = (d: Date) => d.toISOString();
          const subId = "demo-sub-001";
          const demoSubs: SubscriptionRow[] = [
            {
              id: subId,
              plan_type: "professional",
              status: "active",
              provider_subscription_id: "I-FAKEPAYPAL-0001",
              created_at: iso(new Date(now.getTime() - 90 * 24 * 3600 * 1000)),
              updated_at: iso(new Date(now.getTime() - 1 * 24 * 3600 * 1000)),
              current_period_end: iso(new Date(now.getTime() + 20 * 24 * 3600 * 1000)),
              cancel_at_period_end: false,
            },
          ];
          const demoEvents: EventRow[] = [
            { id: "evt-001", event_type: "subscription_created", created_at: iso(new Date(now.getTime() - 90 * 24 * 3600 * 1000)), subscription_id: subId },
            { id: "evt-002", event_type: "payment_succeeded", created_at: iso(new Date(now.getTime() - 60 * 24 * 3600 * 1000)), subscription_id: subId },
            { id: "evt-003", event_type: "payment_succeeded", created_at: iso(new Date(now.getTime() - 30 * 24 * 3600 * 1000)), subscription_id: subId },
            { id: "evt-004", event_type: "plan_updated", created_at: iso(new Date(now.getTime() - 25 * 24 * 3600 * 1000)), subscription_id: subId },
            { id: "evt-005", event_type: "payment_succeeded", created_at: iso(new Date(now.getTime() - 1 * 24 * 3600 * 1000)), subscription_id: subId },
          ];
          setSubs(demoSubs);
          setEvents(demoEvents);
          return;
        }
        const sb: any = supabase;
        const { data: subsData } = await sb
          .from("subscriptions")
          .select("id, plan_type, status, provider_subscription_id, created_at, updated_at, current_period_end, cancel_at_period_end")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (!mounted) return;
        setSubs(subsData || []);

        const ids = (subsData || []).map((s: any) => s.id);
        if (ids.length) {
          const { data: evData } = await sb
            .from("subscription_events")
            .select("id, event_type, created_at, subscription_id")
            .in("subscription_id", ids)
            .order("created_at", { ascending: false });
          if (!mounted) return;
          setEvents(evData || []);
        } else {
          setEvents([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user]);

  const eventMap = useMemo(() => {
    const map: Record<string, EventRow[]> = {};
    for (const e of events) {
      const key = e.subscription_id || "unknown";
      map[key] = map[key] || [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold">Order History</h1>
            </div>
          </header>

          <main className="flex-1 space-y-8 p-8 pt-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">Subscriptions</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Current Period End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.id}</TableCell>
                      <TableCell className="capitalize">{s.plan_type}</TableCell>
                      <TableCell className="capitalize">{s.status}</TableCell>
                      <TableCell className="font-mono text-xs">{s.provider_subscription_id || "—"}</TableCell>
                      <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
                      <TableCell>{s.current_period_end ? new Date(s.current_period_end).toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {subs.length === 0 && (
                  <TableCaption>No subscriptions yet.</TableCaption>
                )}
              </Table>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Events</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Event</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{e.subscription_id}</TableCell>
                      <TableCell>{e.event_type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {events.length === 0 && (
                  <TableCaption>No events recorded.</TableCaption>
                )}
              </Table>
            </section>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
