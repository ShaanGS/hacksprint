export type SmokeStatus = "PASS" | "FAIL" | "SKIPPED";

export type SmokeResult = {
  status: SmokeStatus;
  lines: string[];
};

export const pass = (...lines: string[]): SmokeResult => ({ status: "PASS", lines });
export const fail = (...lines: string[]): SmokeResult => ({ status: "FAIL", lines });

/** Time since `start` (from performance.now()), for the latency figures. */
export const elapsed = (start: number) => `${Math.round(performance.now() - start)} ms`;
