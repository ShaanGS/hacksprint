import { mkdir, readFile, writeFile } from "node:fs/promises";
import { speechToText, textToSpeech } from "@/lib/sarvam/client";
import { elapsed, fail, pass, type SmokeResult } from "./report";

const CLIP = "scripts/smoke/fixtures/order-ta.webm";
const SPEECH_OUTPUT = ".smoke/tts-ta.wav";
// The spec's out-of-stock moment: "Sugar is finished. Do you want jaggery instead?"
const TAMIL_LINE = "சர்க்கரை தீர்ந்துவிட்டது. அதற்கு பதிலாக வெல்லம் வேண்டுமா?";
// A bulbul:v3 voice that Sarvam lists for Tamil.
const TAMIL_VOICE = "ishita";

export async function smokeSarvam(): Promise<SmokeResult> {
  const clip = new Blob([new Uint8Array(await readFile(CLIP))], { type: "audio/webm" });

  const sttStart = performance.now();
  const heard = await speechToText(clip, "order-ta.webm");
  const sttLine = `heard "${heard.transcript}" (${heard.languageCode ?? "language not detected"}, ${elapsed(sttStart)})`;

  const ttsStart = performance.now();
  const speech = await textToSpeech(TAMIL_LINE, "ta-IN", TAMIL_VOICE);
  await mkdir(".smoke", { recursive: true });
  await writeFile(SPEECH_OUTPUT, speech);
  const ttsLine = `spoke a Tamil sentence: ${Math.round(speech.length / 1024)} KB of audio in ${elapsed(ttsStart)}, saved to ${SPEECH_OUTPUT}`;

  if (!heard.transcript.trim()) return fail(sttLine, ttsLine, "speech to text returned no words");
  return pass(sttLine, ttsLine);
}
