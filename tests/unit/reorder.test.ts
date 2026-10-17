import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/reorder/route";

describe("/api/reorder", () => {
  it("rejects invalid request body with 400", async () => {
    const request = new Request("http://localhost:3000/api/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invalid: true }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({ ok: false, error: "bad_request" });
  });

  it("returns { ok: true, sent: false } in preview when n8n env keys are missing", async () => {
    const request = new Request("http://localhost:3000/api/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shopName: "Lakshmi Stores",
        distributorName: "Sri Balaji Agencies",
        lines: [{ name: "Sugar", qty: 5, unit: "kg" }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ ok: true, sent: false });
  });
});
