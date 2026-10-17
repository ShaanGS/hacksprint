-- Agent runs (decision of Oct 18). The planner and the bill-pay agent save each run with every
-- tool call and result, so a plan can be explained afterwards and the next run can read how
-- the last one ended, without carrying any chat history. Runs belong to their shop and are
-- deleted with it, so reset_demo() needs no change.

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  agent text not null check (agent in ('planner', 'bill_pay')),
  goal text not null default '' check (char_length(goal) <= 300),
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  planned_by text check (planned_by in ('model', 'rules')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index agent_runs_shop_created_idx on public.agent_runs (shop_id, agent, created_at desc);

create table public.agent_steps (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.agent_runs (id) on delete cascade,
  seq integer not null check (seq >= 0),
  kind text not null check (kind in ('summary', 'tool_call', 'tool_result', 'plan', 'note')),
  name text not null default '',
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (run_id, seq)
);

-- RLS on, no policies: only the server (service role) reads and writes.
alter table public.agent_runs enable row level security;
alter table public.agent_steps enable row level security;
grant select, insert, update, delete on public.agent_runs, public.agent_steps to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on public.agent_runs, public.agent_steps from anon, authenticated;
