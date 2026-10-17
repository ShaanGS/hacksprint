import { z } from "zod";
import { speechKeyterms } from "@/lib/catalog";
import { customerConversation } from "@/lib/customer/context";
import { handle, HttpError, readJson } from "@/lib/http";
import { isLang, langInfo, langs } from "@/lib/i18n/languages";
import { speechToText } from "@/lib/sarvam/client";
import { takeChoice, takeTurn } from "@/lib/voice/conversation";

// Customer audio (or typed words, or a tapped choice) in; the transcript and the shop's reply
// out. The reply streams as two lines of JSON, so the customer sees their own words the moment
// they are heard, before the agent has answered.

const typedBody = z.object({ lang: z.enum(langs), text: z.string().trim().min(1).max(300) });
const choiceBody = z.object({
  lang: z.enum(langs),
  choice: z.object({ turnId: z.number().int(), index: z.number().int().min(0) }),
});
const jsonBody = z.union([typedBody, choiceBody]);

// Sarvam's REST endpoint is for clips under 30 s; a hold-to-talk turn is a few seconds.
const MAX_AUDIO_BYTES = 2_000_000;

export function POST(request: Request) {
  return handle(async () => {
    if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      const body = await readJson(request, jsonBody);
      const convo = await customerConversation(body.lang);
      const result =
        "text" in body
          ? await takeTurn(convo, { text: body.text, source: "typed" })
          : await takeChoice(convo, body.choice.turnId, body.choice.index);
      return Response.json(result);
    }

    const form = await request.formData();
    const lang = form.get("lang");
    const audio = form.get("audio");
    if (!isLang(lang) || !(audio instanceof Blob) || audio.size === 0) {
      throw new HttpError(400, "Send the recording and the language.");
    }
    if (audio.size > MAX_AUDIO_BYTES) throw new HttpError(413, "That recording is too long.");
    const convo = await customerConversation(lang);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (line: unknown) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        try {
          const started = Date.now();
          const heard = await speechToText(audio, fileNameFor(audio.type), {
            languageCode: langInfo[lang].sarvamCode,
            keyterms: speechKeyterms(convo.products),
          });
          const text = heard.transcript.trim();
          send({ type: "heard", text });
          if (text) {
            const result = await takeTurn(convo, {
              text,
              source: "voice",
              sttMs: Date.now() - started,
            });
            send({ type: "result", ...result });
          }
        } catch (error) {
          console.error(error);
          send({ type: "error" });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
    });
  });
}

/** Sarvam reads the container from the file name: WebM from Chrome and Android, MP4 from iPhone. */
function fileNameFor(type: string): string {
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "turn.mp4";
  if (type.includes("ogg")) return "turn.ogg";
  if (type.includes("wav")) return "turn.wav";
  return "turn.webm";
}
