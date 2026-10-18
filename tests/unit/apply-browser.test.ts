import type { Content } from "@google/genai";
import { describe, expect, it } from "vitest";
import {
  runApplyAgent,
  type ApplyEvent,
  type Browser,
  type PageView,
} from "@/lib/apply-browser/agent";
import type { Facts } from "@/lib/apply-browser/facts";
import type { Generate } from "@/lib/planner/run";

const ORIGIN = "http://localhost:3000";

const facts: Facts = {
  business_name: { value: "Lakshmi Stores", says: "The shop's name", label: "owner_said" },
  loan_amount: { value: "27000", says: "The loan", label: "estimate" },
  mudra_scheme: { value: "Mudra Shishu", says: "The band", label: "estimate" },
};

const pages: PageView[] = [
  {
    origin: ORIGIN,
    title: "Your business",
    fields: [
      { id: "biz", label: "Name of the business", kind: "text", options: [], value: "" },
      { id: "amt", label: "Loan amount required (₹)", kind: "number", options: [], value: "" },
    ],
    buttons: ["Continue"],
  },
  {
    origin: ORIGIN,
    title: "Identity and consent",
    fields: [{ id: "aad", label: "Owner's Aadhaar number", kind: "text", options: [], value: "" }],
    buttons: ["Back", "Send OTP"],
  },
];

/** A two-page form in memory: what was typed, and which page it is on. */
function fakeBrowser() {
  let at = 0;
  const typed: Record<string, string> = {};
  const browser: Browser = {
    view: async () => pages[at],
    fill: async (id, value) => void (typed[id] = value),
    choose: async (id, option) => void (typed[id] = option),
    press: async (button) => void (button === "Continue" && (at += 1)),
  };
  return { browser, typed };
}

const call = (name: string, args: Record<string, unknown>) => ({ id: name, name, args });
const turn = (...calls: ReturnType<typeof call>[]) => ({
  functionCalls: calls,
  content: { role: "model", parts: [] } as Content,
});

async function run(script: ReturnType<typeof turn>[]) {
  const { browser, typed } = fakeBrowser();
  const events: ApplyEvent[] = [];
  const generate: Generate = async () => script.shift() ?? {};
  await runApplyAgent(
    { browser, generate, onEvent: async (event) => void events.push(event) },
    { facts, origin: ORIGIN },
  );
  return { events, typed };
}

describe("the browser agent", () => {
  it("types the shop's own facts, moves on, and stops at the OTP", async () => {
    const { events, typed } = await run([
      turn(
        call("fill_field", { field: "biz", fact: "business_name" }),
        call("fill_field", { field: "amt", fact: "loan_amount" }),
      ),
      turn(call("leave_for_owner", { field: "aad", reason: "identity_or_contact" })),
    ]);
    expect(typed).toEqual({ biz: "Lakshmi Stores", amt: "27000" });
    expect(events.map((e) => e.kind)).toEqual([
      "page",
      "model_call",
      "filled",
      "filled",
      "pressed",
      "page",
      "model_call",
      "left",
      "stopped",
    ]);
    expect(events.at(-1)).toEqual({ kind: "stopped", reason: "otp" });
  });

  it("never fills an identity field, even when the model asks", async () => {
    const { events, typed } = await run([
      turn(call("fill_field", { field: "biz", fact: "business_name" })),
      turn(call("fill_field", { field: "aad", fact: "loan_amount" })),
    ]);
    expect(typed.aad).toBeUndefined();
    expect(events).toContainEqual({ kind: "blocked", field: "aad", why: "sensitive_field" });
  });

  it("refuses a fact the shop does not have, or a number in a name field", async () => {
    const { events, typed } = await run([
      turn(
        call("fill_field", { field: "biz", fact: "aadhaar_number" }),
        call("fill_field", { field: "biz", fact: "loan_amount" }),
      ),
    ]);
    expect(typed.biz).toBeUndefined();
    expect(
      events.filter((e) => e.kind === "blocked").map((e) => e.kind === "blocked" && e.why),
    ).toEqual(["unknown_fact", "wrong_kind"]);
  });

  it("stops when the model gives nothing to do", async () => {
    const { events } = await run([]);
    expect(events.at(-1)).toEqual({ kind: "stopped", reason: "model_failed" });
  });
});
