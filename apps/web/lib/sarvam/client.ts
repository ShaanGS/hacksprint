import { z } from "zod";
import { sarvamEnv } from "@/lib/env";

const SARVAM_URL = "https://api.sarvam.ai";
// A voice turn has a 4 s budget (spec section 8); a hung request must not stall the demo.
const TIMEOUT_MS = 8_000;
// Saaras v4 takes up to 50 key terms of up to 64 characters each.
const MAX_KEYTERMS = 50;

const transcriptionSchema = z.object({
  transcript: z.string(),
  language_code: z.string().nullable(),
});

const speechSchema = z.object({
  audios: z.array(z.string()).min(1),
});

export type Transcription = {
  transcript: string;
  languageCode: string | null;
};

/**
 * Speech to text with Saaras. `codemix` keeps English product names in Latin script inside
 * Tamil or Hindi speech ("ரெண்டு Maggi"). Key terms bias it toward our product names. The
 * browser's recording goes up as it is: Sarvam reads WebM (Chrome, Android) and MP4 (iPhone).
 */
export async function speechToText(
  audio: Blob,
  fileName: string,
  options: { languageCode?: string; keyterms?: string[] } = {},
): Promise<Transcription> {
  const env = sarvamEnv();
  const form = new FormData();
  form.append("file", audio, fileName);
  form.append("model", env.SARVAM_STT_MODEL);
  form.append("mode", "codemix");
  form.append("language_code", options.languageCode ?? "unknown");
  const keyterms = (options.keyterms ?? []).map((term) => term.slice(0, 64)).slice(0, MAX_KEYTERMS);
  // Only Saaras v4 understands key terms; v3 rejects the request if they are sent.
  if (keyterms.length > 0 && env.SARVAM_STT_MODEL.endsWith("v4")) {
    form.append("keyterms", JSON.stringify(keyterms));
  }

  const response = await fetch(`${SARVAM_URL}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": env.SARVAM_API_KEY },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `Sarvam speech to text failed: HTTP ${response.status} ${await response.text()}`,
    );
  }
  const result = transcriptionSchema.parse(await response.json());
  return { transcript: result.transcript, languageCode: result.language_code };
}

/**
 * Text to speech with Bulbul; returns MP3, which every phone plays and is a tenth of WAV's
 * size. Write Indic text in its own script: Sarvam warns that romanized input sounds worse.
 */
export async function textToSpeech(
  text: string,
  languageCode: string,
  speaker: string,
): Promise<Buffer> {
  const env = sarvamEnv();
  const response = await fetch(`${SARVAM_URL}/text-to-speech`, {
    method: "POST",
    headers: { "api-subscription-key": env.SARVAM_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      language_code: languageCode,
      model: env.SARVAM_TTS_MODEL,
      speaker,
      output_audio_codec: "mp3",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `Sarvam text to speech failed: HTTP ${response.status} ${await response.text()}`,
    );
  }
  const { audios } = speechSchema.parse(await response.json());
  return Buffer.from(audios[0], "base64");
}
