import { describe, expect, it } from "vitest";
import { phoneClock } from "@/lib/time";

describe("phoneClock", () => {
  it("shows India time, 12 hour, without AM or PM", () => {
    expect(phoneClock(new Date("2026-10-18T09:30:00Z"))).toBe("3:00");
    expect(phoneClock(new Date("2026-10-17T15:41:00Z"))).toBe("9:11");
  });

  it("shows midnight and noon as 12", () => {
    expect(phoneClock(new Date("2026-10-17T18:35:00Z"))).toBe("12:05");
    expect(phoneClock(new Date("2026-10-18T06:30:00Z"))).toBe("12:00");
  });
});
