import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { langInfo } from "@/lib/i18n/languages";
import { numbersSaid } from "@/lib/owner-voice/numbers";
import { speechToText, textToSpeech } from "@/lib/sarvam/client";

// The stage fallback for Act 1's spoken entry (spec 16.4): the owner's sentence as an audio file,
// sent from the demo tools when the hall is too loud for the mic. It is heard back here the way
// the app hears it, so the clip is known to work before the stage.
// pnpm exec tsx scripts/fixtures/record-entry.ts

const SENTENCE = "ரமேஷ், இருநூறு ரூபாய் கடன்.";
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.join(here, "credit-ramesh-200-ta.mp3");

async function main() {
  process.loadEnvFile("apps/web/.env.local");
  const tamil = langInfo.ta;
  await writeFile(file, await textToSpeech(SENTENCE, tamil.sarvamCode, tamil.voice));
  const audio = new Blob([await readFile(file)], { type: "audio/mpeg" });
  const heard = await speechToText(audio, "credit.mp3", {
    languageCode: tamil.sarvamCode,
    keyterms: ["Ramesh Kumar"],
  });
  console.log(`saved ${path.relative(process.cwd(), file)}`);
  console.log(
    `heard "${heard.transcript}", numbers ${JSON.stringify(numbersSaid(heard.transcript))}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
