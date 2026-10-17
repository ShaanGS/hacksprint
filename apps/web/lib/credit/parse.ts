// "Ramesh 200 on account" (spec B1). The amount is read by code from the words heard, never by a
// model (rule 1): digits, or number words in Tamil, Hindi, Kannada or English. The name is
// matched against the shop's customers; if no single one fits, the owner taps the right one.

/** Number words up to the hundreds, as one word each (Tamil and Kannada say 200 as one word). */
const words: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  பத்து: 10,
  இருபது: 20,
  முப்பது: 30,
  நாற்பது: 40,
  ஐம்பது: 50,
  அறுபது: 60,
  எழுபது: 70,
  எண்பது: 80,
  தொண்ணூறு: 90,
  நூறு: 100,
  இருநூறு: 200,
  முன்னூறு: 300,
  நானூறு: 400,
  ஐநூறு: 500,
  ஐந்நூறு: 500,
  அறுநூறு: 600,
  எழுநூறு: 700,
  எண்ணூறு: 800,
  தொள்ளாயிரம்: 900,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  बीस: 20,
  तीस: 30,
  चालीस: 40,
  पचास: 50,
  साठ: 60,
  सत्तर: 70,
  अस्सी: 80,
  नब्बे: 90,
  ಹತ್ತು: 10,
  ಇಪ್ಪತ್ತು: 20,
  ಮೂವತ್ತು: 30,
  ನಲವತ್ತು: 40,
  ಐವತ್ತು: 50,
  ಅರವತ್ತು: 60,
  ಎಪ್ಪತ್ತು: 70,
  ಎಂಬತ್ತು: 80,
  ತೊಂಬತ್ತು: 90,
  ನೂರು: 100,
  ಇನ್ನೂರು: 200,
  ಮುನ್ನೂರು: 300,
  ನಾನೂರು: 400,
  ಐನೂರು: 500,
  ಆರುನೂರು: 600,
  ಏಳುನೂರು: 700,
  ಎಂಟುನೂರು: 800,
  ಒಂಬೈನೂರು: 900,
};

/** Words that multiply what came before them: "two hundred", "दो सौ", "இரண்டு ஆயிரம்". */
const hundreds = new Set(["hundred", "सौ"]);
const thousands = new Set(["thousand", "हज़ार", "हजार", "ஆயிரம்", "ಸಾವಿರ"]);

/** The amount said, in whole rupees, or null if none was. */
export function parseRupees(heard: string): number | null {
  const digits = heard.replace(/(\d),(?=\d)/g, "$1").match(/\d+(?:\.\d+)?/g);
  if (digits) return Math.round(Number(digits[digits.length - 1]));

  let total = 0;
  let current = 0;
  let found = false;
  for (const token of heard.toLowerCase().split(/[\s,.?!।-]+/)) {
    if (token in words) {
      current += words[token];
      found = true;
    } else if (hundreds.has(token)) {
      current = (current || 1) * 100;
      found = true;
    } else if (thousands.has(token)) {
      total += (current || 1) * 1000;
      current = 0;
      found = true;
    }
  }
  return found ? total + current : null;
}

export type NamedCustomer = { id: string; name: string };

function latinWords(text: string): string[] {
  return text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
}

/** The one customer whose name was said, or null when none or several fit. */
export function matchCustomer(heard: string, customers: NamedCustomer[]): string | null {
  const said = latinWords(heard);
  const score = (customer: NamedCustomer) =>
    latinWords(customer.name).filter((part) =>
      said.some((word) => word === part || (word.length >= 4 && part.startsWith(word))),
    ).length;
  const scored = customers.map((customer) => ({ customer, score: score(customer) }));
  const best = Math.max(0, ...scored.map((entry) => entry.score));
  const winners = scored.filter((entry) => entry.score === best && best > 0);
  return winners.length === 1 ? winners[0].customer.id : null;
}
