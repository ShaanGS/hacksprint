-- The demo data lives in public.seed_demo() (migrations/*_demo_data.sql), so that
-- `pnpm db:reset` and the presenter's Reset button load exactly the same rows.
select public.seed_demo();
