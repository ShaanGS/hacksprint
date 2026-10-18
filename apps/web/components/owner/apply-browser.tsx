"use client";

import { useEffect, useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Button } from "@/components/ui/button";
import { applyBrowserWordsFor, type ApplyBrowserWords } from "@/lib/i18n/apply-browser";
import {
  browserAgentAvailable,
  streamApplyBrowser,
  type ApplyLine,
} from "@/lib/owner/apply-browser-api";

/**
 * The apply agent in a real browser (decision of Oct 18), on the shop's own computer: one tap
 * opens the sandbox lender portal, and each step it takes shows here as it happens. Not offered
 * on the live site, which has no browser to open.
 */
export function ApplyBrowser({ loanRequestId }: { loanRequestId: string }) {
  const { lang } = useOwnerLanguage();
  const words = applyBrowserWordsFor(lang);
  const [available, setAvailable] = useState(false);
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    browserAgentAvailable().then(setAvailable, () => setAvailable(false));
  }, []);
  if (!available) return null;

  const start = () => {
    setRunning(true);
    setLines([]);
    streamApplyBrowser(loanRequestId, (line) => {
      const said = wordsFor(line, words);
      if (said) setLines((before) => [...before, said]);
    })
      .catch(() => setLines((before) => [...before, words.failed]))
      .finally(() => setRunning(false));
  };

  return (
    <section className="space-y-3 rounded-3xl bg-night-raised p-4">
      <p className="text-sm text-night-muted">{words.hint}</p>
      <Button wide variant="yellow" disabled={running} onClick={start}>
        {words.start}
      </Button>
      {lines.length > 0 && (
        <ol className="space-y-1 text-sm">
          {lines.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ol>
      )}
    </section>
  );
}

function wordsFor(line: ApplyLine, words: ApplyBrowserWords): string | null {
  if (line.type === "opened") return words.opened;
  if (line.type === "error") return words.failed;
  if (line.type !== "step") return null;
  switch (line.kind) {
    case "page":
      return words.page(line.title);
    case "filled":
      return words.filled(line.field);
    case "chosen":
      return words.chosen(line.field, line.option);
    case "left":
      return words.left(line.field);
    case "blocked":
      return words.blocked(line.field);
    case "pressed":
      return words.pressed(line.button);
    case "stopped":
      return line.reason === "otp" || line.reason === "consent"
        ? words.yourTurn
        : words.stoppedEarly;
    default:
      return null;
  }
}
