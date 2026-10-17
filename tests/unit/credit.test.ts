import { describe, expect, it } from "vitest";
import { matchCustomer, parseRupees } from "@/lib/credit/parse";
import { numbersSaid } from "@/lib/owner-voice/numbers";

const customers = [
  { id: "ramesh", name: "Ramesh Kumar" },
  { id: "rahul", name: "Rahul Sharma" },
  { id: "lakshmi", name: "Lakshmi Raman" },
  { id: "meena", name: "Meena Krishnan" },
];

describe("spoken credit amounts", () => {
  it("reads digits however the speech engine writes them", () => {
    expect(parseRupees("Ramesh 200 on account")).toBe(200);
    expect(parseRupees("Lakshmi ₹1,250 udhaar")).toBe(1250);
    expect(parseRupees("ரமேஷ் 200 கணக்கில்")).toBe(200);
  });

  it("reads number words in each language", () => {
    expect(parseRupees("Ramesh two hundred on account")).toBe(200);
    expect(parseRupees("one thousand five hundred")).toBe(1500);
    expect(parseRupees("ரமேஷ் இருநூறு கணக்கில்")).toBe(200);
    expect(parseRupees("இருநூறு ஐம்பது")).toBe(250);
    expect(parseRupees("रमेश दो सौ उधार")).toBe(200);
    expect(parseRupees("ರಮೇಶ್ ಇನ್ನೂರು ಖಾತೆ")).toBe(200);
  });

  it("finds no amount when none was said", () => {
    expect(parseRupees("Ramesh on account")).toBeNull();
  });
});

describe("spoken credit names", () => {
  it("finds the one customer named", () => {
    expect(matchCustomer("Ramesh 200 on account", customers)).toBe("ramesh");
    expect(matchCustomer("Ramesh Kumar 200", customers)).toBe("ramesh");
    expect(matchCustomer("Meena kanakku 90", customers)).toBe("meena");
  });

  it("asks the owner when no name or two names fit", () => {
    expect(matchCustomer("ரமேஷ் 200", customers)).toBeNull();
    expect(matchCustomer("Ra 200", customers)).toBeNull();
    expect(matchCustomer("Rahul and Ramesh 200", customers)).toBeNull();
  });
});

describe("numbers the owner said", () => {
  it("hears each Tamil quantity in a list, and keeps money words as one amount", () => {
    const said = numbersSaid("ரெண்டு கிலோ தக்காளி, ஒரு மேகி, அரை கிலோ சர்க்கரை");
    expect(said).toEqual(expect.arrayContaining([2, 1, 0.5]));
    expect(numbersSaid("ரமேஷ் இருநூறு ஐம்பது கடன்")).toContain(250);
  });

  it("does not turn 'ஒரு இருநூறு' into 201 for money", () => {
    expect(parseRupees("ஒரு இருநூறு ரூபாய்")).toBe(200);
  });
});
