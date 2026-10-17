-- The loan tracker (Oct 17): after the loan check, the owner taps each step the bank takes
-- (applied, documents asked, sanctioned, disbursed, or turned down). Once the loan is paid out,
-- its EMIs become ordinary dues (9.16), so the week ahead counts them like any bill, and each
-- night he can note what he kept aside for the next one. We never hold or move the money.

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  loan_request_id uuid not null unique references public.loan_requests (id) on delete cascade,
  status text not null default 'applied'
    check (status in ('applied', 'docs_asked', 'sanctioned', 'disbursed', 'rejected')),
  sanctioned_paise integer check (sanctioned_paise > 0),
  emi_paise integer check (emi_paise > 0),
  tenure_months integer check (tenure_months between 1 and 120),
  disbursed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loans_sanction_complete check (
    status not in ('sanctioned', 'disbursed')
    or (sanctioned_paise is not null and emi_paise is not null and tenure_months is not null)
  ),
  constraint loans_disbursed_has_date check (status <> 'disbursed' or disbursed_on is not null)
);
create index loans_shop_created_idx on public.loans (shop_id, created_at desc);

-- When each step happened, for the timeline on his screen.
create table public.loan_steps (
  id bigint generated always as identity primary key,
  loan_id uuid not null references public.loans (id) on delete cascade,
  status text not null
    check (status in ('applied', 'docs_asked', 'sanctioned', 'disbursed', 'rejected')),
  at timestamptz not null default now()
);
create index loan_steps_loan_at_idx on public.loan_steps (loan_id, at);

-- An EMI is a due owed to the loan, not to a distributor.
alter table public.payables add column loan_id uuid references public.loans (id) on delete cascade;
alter table public.payables alter column distributor_id drop not null;
alter table public.payables add constraint payables_owner_matches_kind check (
  ((kind = 'supplier_bill') = (distributor_id is not null))
  and ((kind = 'loan_emi') = (loan_id is not null))
);
create index payables_loan_due_idx on public.payables (loan_id, due_date) where loan_id is not null;

-- What he says he kept aside for an EMI, in his own account (owner_said).
create table public.emi_set_asides (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops (id) on delete cascade,
  payable_id uuid not null references public.payables (id) on delete cascade,
  amount_paise integer not null check (amount_paise > 0),
  kept_on date not null,
  created_at timestamptz not null default now()
);
create index emi_set_asides_payable_idx on public.emi_set_asides (payable_id);

alter table public.loans enable row level security;
alter table public.loan_steps enable row level security;
alter table public.emi_set_asides enable row level security;
grant select, insert, update, delete on public.loans, public.loan_steps, public.emi_set_asides
  to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on public.loans, public.loan_steps, public.emi_set_asides from anon, authenticated;
