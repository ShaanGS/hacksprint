// `pnpm smoke` runs every check; `pnpm smoke sarvam` runs one.
// Each check makes one real call to its service. A service without keys is SKIPPED, with the
// missing variables and where to get them. The exit code is 0 only if every check passed.
import { EnvError } from "@/lib/env";
import { smokeGemini } from "./gemini";
import { smokePaytm } from "./paytm";
import type { SmokeResult, SmokeStatus } from "./report";
import { smokeSarvam } from "./sarvam";
import { smokeSupabase } from "./supabase";

const ENV_FILE = "apps/web/.env.local";

const checks: Record<string, { run: () => Promise<SmokeResult>; keysFrom: string }> = {
  supabase: { run: smokeSupabase, keysFrom: "Supabase dashboard > Project Settings > API Keys" },
  sarvam: { run: smokeSarvam, keysFrom: "https://dashboard.sarvam.ai" },
  gemini: { run: smokeGemini, keysFrom: "https://aistudio.google.com/apikey" },
  paytm: {
    run: smokePaytm,
    keysFrom: "https://dashboard.paytmpayments.com/next/apikeys (test keys)",
  },
};

function loadEnvFile() {
  try {
    process.loadEnvFile(ENV_FILE);
  } catch {
    console.log(`${ENV_FILE} not found. Copy apps/web/.env.example to it and fill it in.\n`);
  }
}

async function runCheck(name: string): Promise<SmokeStatus> {
  const check = checks[name];
  let result: SmokeResult;
  try {
    result = await check.run();
  } catch (error) {
    if (error instanceof EnvError) {
      result = { status: "SKIPPED", lines: [...error.problems, `Get keys at ${check.keysFrom}`] };
    } else {
      result = { status: "FAIL", lines: [error instanceof Error ? error.message : String(error)] };
    }
  }
  console.log(`${name.padEnd(9)} ${result.status}`);
  for (const line of result.lines) console.log(`          ${line}`);
  return result.status;
}

async function main() {
  loadEnvFile();
  const requested = process.argv[2];
  if (requested && !(requested in checks)) {
    console.log(`Unknown check "${requested}". Choose one of: ${Object.keys(checks).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const statuses: SmokeStatus[] = [];
  for (const name of requested ? [requested] : Object.keys(checks)) {
    statuses.push(await runCheck(name));
  }

  const count = (status: SmokeStatus) => statuses.filter((s) => s === status).length;
  console.log(`\n${count("PASS")} passed, ${count("SKIPPED")} skipped, ${count("FAIL")} failed`);
  process.exitCode = count("PASS") === statuses.length ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
