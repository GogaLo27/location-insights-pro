// src/lib/api/index.ts
import * as mock from "@/lib/demo/mockApi";

// Demo mode is on when a demo session is active
const isDemoEnabled = () => typeof window !== 'undefined' && localStorage.getItem('lip_demo_mode') === 'true';

// Wire your real impls here once needed:
// import { listLocations, listReviews, postReply, getInsights } from "@/lib/realApi";

const real = {
  listLocations: async () => { throw new Error("Real API not wired"); },
  listReviews: async (_args?: any) => { throw new Error("Real API not wired"); },
  postReply: async (_id: string, _c: string) => { throw new Error("Real API not wired"); },
  getInsights: async (_locId: string) => { throw new Error("Real API not wired"); },
};

const source = () => (isDemoEnabled() ? mock : real);

export const api = {
  listLocations: (...a: any[]) => source().listLocations(...a as any),
  listReviews:   (...a: any[]) => source().listReviews(...a as any),
  postReply:     (...a: any[]) => source().postReply(...a as any),
  getInsights:   (...a: any[]) => source().getInsights(...a as any),
};
