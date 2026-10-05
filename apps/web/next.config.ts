import type { NextConfig } from "next";
import { assertStartupEnv } from "./lib/env";

// Fail fast: `next dev` and `next build` stop here with a message naming each missing key.
// `next typegen` (part of `pnpm typecheck` and the Stop hook) loads this file too but needs no keys.
if (!process.argv.includes("typegen")) {
  assertStartupEnv();
}

const nextConfig: NextConfig = {};

export default nextConfig;
