-- Razorpay's test mode as a third way to take a payment (decision of Oct 18). Its payment links
-- open Razorpay's own sandbox checkout, so a judge can pay a reminder's QR there and the
-- collection agent sees it. Paytm and our own test page stay as they are.

alter table public.payments drop constraint payments_provider_check;
alter table public.payments
  add constraint payments_provider_check check (provider in ('paytm', 'test', 'razorpay'));

alter table public.shops drop constraint shops_payment_mode_check;
alter table public.shops
  add constraint shops_payment_mode_check check (payment_mode in ('test', 'paytm', 'razorpay'));
