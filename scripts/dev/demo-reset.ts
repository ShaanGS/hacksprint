// `pnpm demo:reset` restores the demo shop (spec section 16): every table cleared and the shop's
// history loaded again, dates relative to now. It must finish in under 5 seconds.
import { resetDemo } from "@/lib/demo/reset";
import { createServiceClient } from "@/lib/supabase/server";

async function main() {
  try {
    process.loadEnvFile("apps/web/.env.local");
  } catch {
    // The variables may already be in the environment.
  }
  const started = Date.now();
  await resetDemo(createServiceClient());
  const seconds = (Date.now() - started) / 1000;
  console.log(
    `Demo shop restored in ${seconds.toFixed(1)} s${seconds > 5 ? " (over the 5 s budget)" : ""}.`,
  );
  // The realtime client keeps a timer running after the change message; the work is done, so the
  // command ends here instead of a minute later.
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
