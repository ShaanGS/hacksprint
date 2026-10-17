/** Dev scripts write test rows into the database; they must never touch production. */
export function assertDevEnvironment(env: string | undefined = process.env.NODE_ENV): void {
  if (env === "production") {
    throw new Error("Refusing to run: this is a dev-only script and cannot run in production.");
  }
}
