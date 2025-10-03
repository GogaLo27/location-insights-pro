// src/lib/api/index.ts
// Wire your real impls here once needed:
// import { listLocations, listReviews, postReply, getInsights } from "@/lib/realApi";

const api = {
  listLocations: async () => { throw new Error("Real API not wired"); },
  listReviews: async (_args?: any) => { throw new Error("Real API not wired"); },
  postReply: async (_id: string, _c: string) => { throw new Error("Real API not wired"); },
  getInsights: async (_locId: string) => { throw new Error("Real API not wired"); },
};

export { api };
