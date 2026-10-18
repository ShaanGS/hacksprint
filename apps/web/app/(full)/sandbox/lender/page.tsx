"use client";

import { useState } from "react";

// A sandbox lender portal (decision of Oct 18): a plain business-loan form in a bank's style for
// the apply agent to fill in a real browser, as Razorpay's test mode is for payments. It is ours,
// it says so, and nothing typed here leaves the page: no real lender ever sees the shop's data
// (rule 8). Its labels and field ids are its own, so the agent has to read them.

type Field = {
  id: string;
  label: string;
  kind: "text" | "number" | "url" | "tel" | "select" | "checkbox";
  options?: string[];
};

const pages: { title: string; fields: Field[] }[] = [
  {
    title: "Your business",
    fields: [
      { id: "applicant_entity", label: "Name of the business (as registered)", kind: "text" },
      {
        id: "entity_activity",
        label: "Nature of business activity",
        kind: "select",
        options: [
          "Retail shop (kirana / grocery)",
          "Tailoring",
          "Food stall",
          "Manufacturing",
          "Services",
        ],
      },
      { id: "vintage_years", label: "Years the business has been running", kind: "number" },
    ],
  },
  {
    title: "Money",
    fields: [
      { id: "turnover_monthly", label: "Average monthly sales (₹)", kind: "number" },
      {
        id: "digital_receipts",
        label: "Of which received digitally, by UPI or card (₹ a month)",
        kind: "number",
      },
      { id: "amount_sought", label: "Loan amount required (₹)", kind: "number" },
      {
        id: "loan_purpose",
        label: "Purpose of the loan",
        kind: "select",
        options: ["Working capital (stock)", "Buying equipment", "Shop repairs", "Other"],
      },
      {
        id: "scheme_choice",
        label: "Scheme",
        kind: "select",
        options: ["Mudra Shishu", "Mudra Kishore", "Mudra Tarun"],
      },
      { id: "repayment_track", label: "Supplier bills paid on time (%)", kind: "number" },
    ],
  },
  {
    title: "Identity and consent",
    fields: [
      { id: "kyc_aadhaar", label: "Owner's Aadhaar number", kind: "text" },
      { id: "kyc_mobile", label: "Mobile number for OTP", kind: "tel" },
      {
        id: "share_consent",
        label: "I agree to share my business records with this lender",
        kind: "checkbox",
      },
    ],
  },
];

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-base text-ink";

export default function SandboxLenderPage() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [otpAsked, setOtpAsked] = useState(false);
  const page = pages[step];
  const last = step === pages.length - 1;
  const set = (id: string, value: string) => setValues((before) => ({ ...before, [id]: value }));

  return (
    <main className="mx-auto max-w-xl px-4 py-8 text-ink">
      <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm font-semibold">
        Sandbox lender portal: not a real lender. Nothing typed here leaves this page.
      </p>
      <h1 className="mt-6 text-2xl font-bold">Business loan application</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Step {step + 1} of {pages.length}
      </p>
      <form className="mt-6 space-y-5" onSubmit={(event) => event.preventDefault()}>
        <h2 className="text-lg font-semibold">{page.title}</h2>
        {page.fields.map((field) =>
          field.kind === "checkbox" ? (
            <label key={field.id} htmlFor={field.id} className="flex items-start gap-3">
              <input
                id={field.id}
                type="checkbox"
                className="mt-1 size-5"
                checked={values[field.id] === "yes"}
                onChange={(event) => set(field.id, event.target.checked ? "yes" : "")}
              />
              <span>{field.label}</span>
            </label>
          ) : (
            <div key={field.id}>
              <label htmlFor={field.id} className="text-sm font-semibold">
                {field.label}
              </label>
              {field.kind === "select" ? (
                <select
                  id={field.id}
                  className={inputClass}
                  value={values[field.id] ?? ""}
                  onChange={(event) => set(field.id, event.target.value)}
                >
                  <option value="">Select</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.id}
                  type={field.kind}
                  className={inputClass}
                  value={values[field.id] ?? ""}
                  onChange={(event) => set(field.id, event.target.value)}
                />
              )}
            </div>
          ),
        )}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button
              type="button"
              className="rounded-full bg-surface-muted px-6 py-3 font-semibold"
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="rounded-full bg-ink px-6 py-3 font-semibold text-surface"
            onClick={() => (last ? setOtpAsked(true) : setStep(step + 1))}
          >
            {last ? "Send OTP" : "Continue"}
          </button>
        </div>
        {otpAsked && (
          <p className="text-sm text-ink-muted">
            Sandbox: no OTP is sent. A real lender would text the owner, and only he can go on.
          </p>
        )}
      </form>
    </main>
  );
}
