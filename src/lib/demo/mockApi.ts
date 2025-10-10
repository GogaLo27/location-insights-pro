// src/lib/demo/mockApi.ts
import locations from "@/mocks/locations.json";
import reviewsData from "@/mocks/reviews.json";
import insights from "@/mocks/insights.json";

export type Location = (typeof locations)[number];
export type Review = (typeof reviewsData)[number];

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function listLocations(): Promise<Location[]> {
  await sleep(120);
  return locations as Location[];
}

export async function listReviews(params: { locationId?: string } = {}): Promise<Review[]> {
  await sleep(120);
  const { locationId } = params;
  const rows = (reviewsData as Review[]).filter(r => !locationId || r.locationId === locationId);
  return rows.sort((a, b) => +new Date(b.createTime) - +new Date(a.createTime));
}

export async function postReply(reviewId: string, comment: string): Promise<{ ok: true }> {
  await sleep(80);
  const r = (reviewsData as Review[]).find(r => r.reviewId === reviewId);
  if (r) (r as any).reply = { comment, updateTime: new Date().toISOString() };
  return { ok: true };
}

export async function getInsights(locationId: string): Promise<any> {
  await sleep(80);
  // @ts-ignore
  return insights[locationId] ?? { period: "last_28_days", metrics: {} };
}

