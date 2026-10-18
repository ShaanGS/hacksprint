import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRazorpayLink,
  razorpayLinkBody,
  razorpayPaid,
  type RazorpayLink,
} from "@/lib/razorpay/client";

const link = (over: Partial<RazorpayLink>): RazorpayLink => ({
  id: "plink_1",
  short_url: "https://rzp.io/rzp/abc",
  status: "created",
  amount: 420_000,
  amount_paid: 0,
  payments: null,
  ...over,
});

describe("razorpayPaid", () => {
  it("is the captured payment's id once the whole amount is in", () => {
    const paid = link({
      status: "paid",
      amount_paid: 420_000,
      payments: [{ payment_id: "pay_9", amount: 420_000, status: "captured" }],
    });
    expect(razorpayPaid(paid, 420_000)).toBe("pay_9");
  });

  it("is null while the link waits, is partly paid, or paid less than we asked", () => {
    expect(razorpayPaid(link({}), 420_000)).toBeNull();
    expect(
      razorpayPaid(link({ status: "partially_paid", amount_paid: 100_000 }), 420_000),
    ).toBeNull();
    const short = link({
      status: "paid",
      amount_paid: 400_000,
      payments: [{ payment_id: "pay_9", amount: 400_000, status: "captured" }],
    });
    expect(razorpayPaid(short, 420_000)).toBeNull();
  });
});

describe("createRazorpayLink", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("asks for the whole amount, sends no customer details and no messages", () => {
    const body = razorpayLinkBody({
      amountPaise: 420_000,
      description: "Credit Lakshmi Stores",
      referenceId: "pay-row-1",
    });
    expect(body).toEqual({
      amount: 420_000,
      currency: "INR",
      accept_partial: false,
      description: "Credit Lakshmi Stores",
      reference_id: "pay-row-1",
      notify: { sms: false, email: false },
      reminder_enable: false,
    });
    expect(body).not.toHaveProperty("customer");
  });

  it("signs in with the key id and secret, and returns the short link", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_key");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret");
    const fetchMock = vi.fn(async () => Response.json(link({})));
    vi.stubGlobal("fetch", fetchMock);
    const made = await createRazorpayLink({
      amountPaise: 420_000,
      description: "Credit Lakshmi Stores",
      referenceId: "pay-row-1",
    });
    expect(made).toEqual({ id: "plink_1", shortUrl: "https://rzp.io/rzp/abc" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.razorpay.com/v1/payment_links");
    expect(new Headers(init.headers).get("Authorization")).toBe(
      `Basic ${Buffer.from("rzp_test_key:secret").toString("base64")}`,
    );
  });
});
