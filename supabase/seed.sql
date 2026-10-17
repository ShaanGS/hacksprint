-- The demo shop lives in database functions, so the presenter's Reset button loads exactly what
-- `pnpm db:reset` loads: the shop and its catalogue, then its history (spec v2, section 11).
select public.seed_demo();
select public.seed_demo_history((select id from public.shops limit 1));
