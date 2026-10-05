import { readFileSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ESLint runs from the repo root, where React isn't installed, so read its version from the app.
const webPackage = JSON.parse(readFileSync("apps/web/package.json", "utf8"));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // One config for the whole repo; tell Next's rules where the app lives.
  {
    settings: {
      next: { rootDir: "apps/web/" },
      react: { version: webPackage.dependencies.react },
    },
  },
  // Code rule: no stray console.log. console.warn and console.error are real logging.
  { rules: { "no-console": ["error", { allow: ["warn", "error"] }] } },
  // Smoke scripts report to the terminal on purpose.
  { files: ["scripts/**"], rules: { "no-console": "off" } },
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
