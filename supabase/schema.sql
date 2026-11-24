-- BEFORE 월 0원 운영을 위한 7일 캐싱 테이블 (Supabase SQL Editor에서 1회 실행)
create table if not exists public.product_reports (
  id uuid primary key default gen_random_uuid(),
  query_key text unique not null,
  product_name text not null,
  category text not null,
  report_json jsonb not null,
  hit_count integer not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists idx_product_reports_query_key on public.product_reports (query_key);
create index if not exists idx_product_reports_expires_at on public.product_reports (expires_at);
