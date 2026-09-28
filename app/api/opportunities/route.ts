import { authenticateRequest } from "@/lib/supabase/server-auth";
import { getRequestIdentifier, rateLimit } from "@/lib/server/rate-limit";
import { z } from "zod";
import {
  greenhouseSources,
  mapGreenhouseJobs,
  sortAndLimitOpportunities,
  type OpportunityFeedResponse,
  type OpportunitySourceStatus,
} from "@/lib/job-opportunities";

export const runtime = "nodejs";

const greenhouseResponseSchema = z.object({
  jobs: z.array(z.object({
    id: z.number().int().positive(),
    title: z.string().min(1).max(500),
    updated_at: z.string().optional(),
    absolute_url: z.string().min(1).max(2_000),
    location: z.object({ name: z.string().max(500) }).optional(),
  })).max(10_000),
  meta: z.object({ total: z.number().int().nonnegative() }).optional(),
});

const CACHE_DURATION_MS = 10 * 60_000;
let lastSuccessfulFeed: { expiresAt: number; value: OpportunityFeedResponse } | null = null;

async function fetchSource(source: (typeof greenhouseSources)[number]) {
  const endpoint = `https://boards-api.greenhouse.io/v1/boards/${source.boardToken}/jobs`;
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`${source.company} returned ${response.status}`);
  const parsed = greenhouseResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`${source.company} returned an unexpected feed format`);
  return mapGreenhouseJobs(source, parsed.data.jobs);
}

export async function GET(request: Request) {
  const identifier = getRequestIdentifier(request);
  const limit = rateLimit(`opportunities:${identifier}`, 20, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many opportunity refreshes. Please retry shortly.", retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const user = await authenticateRequest(request);
  if (!user) return Response.json({ error: "Your session expired. Please sign in again." }, { status: 401 });

  if (lastSuccessfulFeed && lastSuccessfulFeed.expiresAt > Date.now()) {
    return Response.json(lastSuccessfulFeed.value, {
      headers: { "Cache-Control": "private, no-store", "X-Opportunity-Cache": "HIT", "X-RateLimit-Remaining": String(limit.remaining) },
    });
  }

  const results = await Promise.allSettled(greenhouseSources.map(fetchSource));
  const opportunities = sortAndLimitOpportunities(results.flatMap((result) => result.status === "fulfilled" ? result.value : []));
  const sources: OpportunitySourceStatus[] = results.map((result, index) => ({
    company: greenhouseSources[index].company,
    status: result.status === "fulfilled" ? "live" : "unavailable",
    count: result.status === "fulfilled" ? result.value.length : 0,
  }));

  if (!opportunities.length) {
    if (lastSuccessfulFeed) {
      return Response.json(
        { ...lastSuccessfulFeed.value, stale: true, sources, notice: "Live sources are temporarily unavailable. Showing the last successfully checked results." },
        { headers: { "Cache-Control": "private, no-store", "X-Opportunity-Cache": "STALE" } },
      );
    }
    return Response.json({ error: "Official opportunity feeds are temporarily unavailable. Your application tracker is still available." }, { status: 502 });
  }

  const value: OpportunityFeedResponse = {
    opportunities,
    fetchedAt: new Date().toISOString(),
    stale: false,
    sources,
    notice: "Published roles from official public company job boards. Availability, eligibility and deadlines must be confirmed on the employer page.",
  };
  lastSuccessfulFeed = { expiresAt: Date.now() + CACHE_DURATION_MS, value };

  return Response.json(value, {
    headers: { "Cache-Control": "private, no-store", "X-Opportunity-Cache": "MISS", "X-RateLimit-Remaining": String(limit.remaining) },
  });
}
