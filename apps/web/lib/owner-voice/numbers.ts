import { parseRupees } from "@/lib/credit/parse";

// Rule 1: the model never invents a number. Every number in an entry must be one the owner said:
// written as digits in the transcript, or spoken as number words.

// Small quantities as Tamil speech says them ("ஒரு கிலோ", "ரெண்டு பாக்கெட்", "அரை கிலோ"). Kept
// out of the money parser, where "ஒரு இருநூறு" means "about 200", not 201.
const quantityWords: Record<string, number> = {
  அரை: 0.5,
  ஒரு: 1,
  ஒன்று: 1,
  ஒண்ணு: 1,
  இரண்டு: 2,
  ரெண்டு: 2,
  மூன்று: 3,
  மூணு: 3,
  நான்கு: 4,
  நாலு: 4,
  ஐந்து: 5,
  அஞ்சு: 5,
  ஆறு: 6,
  ஏழு: 7,
  எட்டு: 8,
  ஒன்பது: 9,
  பதினொன்று: 11,
  பன்னிரண்டு: 12,
  பதினைந்து: 15,
};

/**
 * Every number in the transcript: digit groups (commas allowed), each number word on its own (a
 * list of items has one per item), and all the words read as one amount ("இருநூறு ஐம்பது").
 */
export function numbersSaid(transcript: string): number[] {
  const digits = (transcript.replace(/(\d),(?=\d)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).map(
    Number,
  );
  const spoken = transcript.replace(/\d+(?:[.,]\d+)*/g, " ");
  const each = spoken
    .toLowerCase()
    .split(/[\s,.?!।-]+/)
    .flatMap((word) => {
      const value = quantityWords[word] ?? parseRupees(word);
      return value === null ? [] : [value];
    });
  const whole = parseRupees(spoken);
  return [...digits, ...each, ...(whole === null ? [] : [whole])];
}

export function wasSaid(value: number, transcript: string): boolean {
  return numbersSaid(transcript).some((said) => Math.abs(said - value) < 1e-9);
}
