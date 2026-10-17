import type { NextConfig } from "next";
import { assertStartupEnv, isPreview } from "./lib/env";

// Fail fast: once any service key is set, `next dev` and `next build` stop here with a message
// naming each missing one. With no keys at all the app builds as a preview on sample data.
// `next typegen` (part of `pnpm typecheck`) loads this file too but needs no keys.
if (!process.argv.includes("typegen") && !isPreview()) {
  assertStartupEnv();
}

const nextConfig: NextConfig = {};

export default nextConfig;
