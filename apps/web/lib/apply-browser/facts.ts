import type { Application } from "@/lib/loans/application";
import type { SourceLabel } from "@/lib/rotation/labels";
import { mudraBands } from "@/lib/schemes/catalog";

// What the browser agent may type into a lender's form: totals from the shop's own records,
// each worked out and formatted by code. The model only picks which fact goes in which field;
// it never writes a value (rule 1). Nothing identifying is on this list: Aadhaar, PAN, phone and
// bank details are always left for the owner, and so is anything his records do not say.

export const factKeys = [
  "business_name",
  "business_activity",
  "monthly_sales",
  "monthly_digital",
  "loan_amount",
  "loan_purpose",
  "mudra_scheme",
  "bills_paid_on_time",
] as const;
export type FactKey = (typeof factKeys)[number];

/** A value ready to type, what it is in plain words, and where it came from. */
export type Fact = { value: string; says: string; label: SourceLabel };
export type Facts = Partial<Record<FactKey, Fact>>;

// Forms ask for whole rupees.
const rupees = (paise: number) => String(Math.round(paise / 100));

export function applyFacts(application: Application): Facts {
  const { monthly_sales: sales } = application;
  const band = mudraBands.find((b) => b.key === application.band);
  const onTime = application.bills_paid_on_time;
  return {
    business_name: { value: application.shop, says: "The shop's name", label: "owner_said" },
    business_activity: {
      value: "Kirana (grocery) shop",
      says: "What the business does",
      label: "owner_said",
    },
    monthly_sales: {
      value: rupees(sales.verified_paise + sales.declared_paise),
      says: "Average monthly sales, cash and digital, over the statement's months",
      label: "owner_said",
    },
    monthly_digital: {
      value: rupees(sales.verified_paise),
      says: "Of the monthly sales, the part paid digitally and verified",
      label: "verified_payment",
    },
    loan_amount: {
      value: rupees(application.loan_paise),
      says: "The loan this week needs after collecting",
      label: "estimate",
    },
    loan_purpose: {
      value: application.purpose === "equipment" ? "Equipment" : "Working capital: stock",
      says: "What the loan is for",
      label: "owner_said",
    },
    ...(band && {
      mudra_scheme: {
        value: `Mudra ${band.name}`,
        says: "The Mudra band the loan falls in",
        label: "estimate" as const,
      },
    }),
    ...(typeof onTime === "number" && {
      bills_paid_on_time: {
        value: String(onTime),
        says: "Supplier bills paid on time, in percent",
        label: "owner_said" as const,
      },
    }),
  };
}
