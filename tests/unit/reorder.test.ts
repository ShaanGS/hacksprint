import { describe, expect, it } from "vitest";
import { POST } from "../../apps/web/app/api/reorder/route";

describe("reorder route", () => {
  it("rejects invalid payloads with 400", async () => {
    const req = new Request("http://localhost/api/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distributorName: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it("returns demo success when preview or keys missing", async () => {
    const req = new Request("http://localhost/api/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distributorName: "Sri Balaji Agencies",
        shopName: "Lakshmi Stores",
        lines: [{ name: "Sugar", qty: 20, unit: "kg" }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
