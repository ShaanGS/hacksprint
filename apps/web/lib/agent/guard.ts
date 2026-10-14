import { MAX_QTY_PER_LINE } from "@/lib/orders/quantity";

// The model never sees a price, total or stock count, so a reply that talks about money or big
// numbers can only be invented. Such a reply is replaced by a template before anyone hears it.

const moneyWords =
  /₹|\brs\b|\brupees?\b|\binr\b|\bpaise\b|\bhundred\b|ரூபாய்|ரூ\.|நூறு|ரூபா|रुपय|रुपए|रुपये|पैसे|सौ|ರೂಪಾಯಿ|ರೂ\.|ನೂರು/i;

/** True when a reply mentions money, or a number too big to be a quantity on one line. */
export function looksLikeMoney(reply: string): boolean {
  if (moneyWords.test(reply)) return true;
  const numbers = reply.match(/\d+(?:\.\d+)?/g) ?? [];
  return numbers.some((n) => Number(n) > MAX_QTY_PER_LINE);
}
