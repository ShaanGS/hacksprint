import { mudraBands, udyam, udyamAssist, type MudraBandKey } from "@/lib/schemes/catalog";

// Which official scheme covers a loan of a given size, and the registration step before applying
// (spec section 10). Pure, from the catalogue only.

export type ShopProfile = {
  udyamStatus: "yes" | "no" | "unsure";
  hasPan: boolean;
  repaidTarunBefore: boolean;
};

export type BandAnswer =
  | { covered: true; band: (typeof mudraBands)[number] }
  | { covered: false; reason: "needs_tarun_repaid" | "above_mudra" };

/** The Mudra band for a loan (exactly ₹50,000 is Shishu); Tarun Plus needs a repaid Tarun loan. */
export function mudraBand(loanPaise: number, repaidTarunBefore: boolean): BandAnswer {
  const band = mudraBands.find((b) => loanPaise > b.fromPaise && loanPaise <= b.upToPaise);
  if (!band) return { covered: false, reason: "above_mudra" };
  if (band.key === "tarun_plus" && !repaidTarunBefore) {
    return { covered: false, reason: "needs_tarun_repaid" };
  }
  return { covered: true, band };
}

export type RegistrationStep =
  | { step: "none" }
  | { step: "udyam"; url: string; fact: string }
  | { step: "udyam_assist"; fact: string };

/** Udyam first if he has PAN; without PAN, Udyam Assist through his bank. */
export function registrationStep(profile: ShopProfile): RegistrationStep {
  if (profile.udyamStatus === "yes") return { step: "none" };
  if (profile.hasPan) return { step: "udyam", url: udyam.links[0].url, fact: udyam.fact };
  return { step: "udyam_assist", fact: udyamAssist.fact };
}

export type { MudraBandKey };
