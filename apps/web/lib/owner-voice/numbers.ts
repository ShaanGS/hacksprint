import { parseRupees } from "@/lib/credit/parse";

// Rule 1: the model never invents a number. Every number in an entry must be one the owner said:
// written as digits in the transcript, or spoken as number words.

/** Every number in the transcript: digit groups (commas allowed) and the spoken-words amount. */
export function numbersSaid(transcript: string): number[] {
  const digits = (transcript.replace(/(\d),(?=\d)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).map(
    Number,
  );
  const words = parseRupees(transcript.replace(/\d+(?:[.,]\d+)*/g, " "));
  return words === null ? digits : [...digits, words];
}

export function wasSaid(value: number, transcript: string): boolean {
  return numbersSaid(transcript).some((said) => Math.abs(said - value) < 1e-9);
}
