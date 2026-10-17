import { describe, expect, it } from "vitest";
import { loanNeeded } from "@/lib/rotation/loan";
import { mudraBand, registrationStep } from "@/lib/schemes/band";
import { fixedLines, loanForms } from "@/lib/schemes/catalog";

const rupees = (value: number) => value * 100;

describe("loan needed (9.14)", () => {
  it("is the need less spare money and late payers, rounded up to the next ₹1,000", () => {
    expect(loanNeeded(rupees(48_500), rupees(10_000), rupees(9_600))).toBe(rupees(29_000));
    expect(loanNeeded(rupees(48_500), rupees(12_000), rupees(9_600))).toBe(rupees(27_000));
  });

  it("keeps a round amount as it is", () => {
    expect(loanNeeded(rupees(29_000), 0, 0)).toBe(rupees(29_000));
  });

  it("grows when the week is already short without the order", () => {
    expect(loanNeeded(rupees(10_000), rupees(-5_000), 0)).toBe(rupees(15_000));
  });

  it("is zero when collecting covers the need", () => {
    expect(loanNeeded(rupees(8_000), rupees(2_000), rupees(9_600))).toBe(0);
    expect(loanNeeded(rupees(8_000), rupees(8_000), 0)).toBe(0);
  });
});

describe("the Mudra band (section 10)", () => {
  it("puts exactly ₹50,000 in Shishu and a rupee more in Kishore", () => {
    expect(mudraBand(rupees(50_000), false)).toMatchObject({
      covered: true,
      band: { key: "shishu" },
    });
    expect(mudraBand(rupees(50_001), false)).toMatchObject({
      covered: true,
      band: { key: "kishore" },
    });
  });

  it("gives Tarun up to ₹10 lakh and Tarun Plus only after repaying a Tarun loan", () => {
    expect(mudraBand(rupees(10_00_000), false)).toMatchObject({ band: { key: "tarun" } });
    expect(mudraBand(rupees(15_00_000), false)).toEqual({
      covered: false,
      reason: "needs_tarun_repaid",
    });
    expect(mudraBand(rupees(15_00_000), true)).toMatchObject({
      covered: true,
      band: { key: "tarun_plus" },
    });
  });

  it("says when a loan is beyond Mudra", () => {
    expect(mudraBand(rupees(25_00_000), true)).toEqual({ covered: false, reason: "above_mudra" });
  });
});

describe("before applying", () => {
  it("registers on Udyam with PAN, through Udyam Assist without it, not at all when done", () => {
    expect(
      registrationStep({ udyamStatus: "no", hasPan: true, repaidTarunBefore: false }).step,
    ).toBe("udyam");
    expect(
      registrationStep({ udyamStatus: "unsure", hasPan: false, repaidTarunBefore: false }).step,
    ).toBe("udyam_assist");
    expect(
      registrationStep({ udyamStatus: "yes", hasPan: true, repaidTarunBefore: false }).step,
    ).toBe("none");
  });

  it("names the loan form by purpose", () => {
    expect(loanForms.stock_rotation.line).toBe(
      "Ask for working capital as a cash credit limit with a RuPay MUDRA card.",
    );
    expect(loanForms.equipment.line).toBe("Ask for a term loan with a fixed EMI.");
  });

  it("always carries the two fixed lines", () => {
    expect(fixedLines).toEqual([
      "The bank decides; we do not promise approval.",
      "Applying for Mudra or Udyam costs nothing. Anyone asking you for a fee is not the government.",
    ]);
  });
});
