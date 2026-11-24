import { createClient } from "@supabase/supabase-js";
import type { BeforeReport } from "./types";

const memoryCache = new Map<string, { data: BeforeReport; expiresAt: number }>();

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function normalizeQueryKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getCachedReport(queryKey: string): Promise<BeforeReport | null> {
  const mem = memoryCache.get(queryKey);
  if (mem && mem.expiresAt > Date.now()) {
    return { ...mem.data, cached: true };
  }

  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("product_reports")
    .select("report_json, expires_at, hit_count")
    .eq("query_key", queryKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data?.report_json) return null;

  // Increment hit count asynchronously (best effort)
  sb.from("product_reports")
    .update({ hit_count: (data.hit_count ?? 1) + 1 })
    .eq("query_key", queryKey)
    .then(() => {});

  const report = { ...(data.report_json as BeforeReport), cached: true };
  memoryCache.set(queryKey, { data: report, expiresAt: Date.now() + 1000 * 60 * 60 });
  return report;
}

export async function saveCachedReport(report: BeforeReport): Promise<void> {
  memoryCache.set(report.queryKey, {
    data: report,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24,
  });

  const sb = getSupabase();
  if (!sb) return;

  await sb.from("product_reports").upsert(
    {
      query_key: report.queryKey,
      product_name: report.productName,
      category: report.category,
      report_json: report,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
    { onConflict: "query_key" }
  );
}
