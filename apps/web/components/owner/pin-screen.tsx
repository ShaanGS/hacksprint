"use client";

import { Delete } from "lucide-react";
import { motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitch } from "@/components/owner/language-switch";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Art } from "@/components/ui/art";
import { cn } from "@/lib/cn";
import { signIn, type PinResult } from "@/lib/owner/live";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

/**
 * The shop PIN, once per phone (spec section 13): judges cannot approve from their own phones.
 * Every key press also counts as the tap that turns the phone's sound on, so the first order
 * after signing in is heard.
 */
export function PinScreen({
  shopName,
  onKeyTap,
  onSignedIn,
}: {
  shopName: string;
  /** Called inside each key tap, before anything is awaited. */
  onKeyTap: () => void;
  onSignedIn: () => void;
}) {
  const { text } = useOwnerLanguage();
  const [digits, setDigits] = useState("");
  const [problem, setProblem] = useState<Exclude<PinResult, "ok"> | null>(null);
  const checking = useRef(false);
  const shake = useAnimationControls();

  async function press(key: string) {
    onKeyTap();
    if (checking.current) return;
    if (key === "delete") {
      setDigits((current) => current.slice(0, -1));
      return;
    }
    const typed = (digits + key).slice(0, PIN_LENGTH);
    setDigits(typed);
    setProblem(null);
    if (typed.length < PIN_LENGTH) return;
    checking.current = true;
    const result = await signIn(typed);
    checking.current = false;
    if (result === "ok") {
      onSignedIn();
      return;
    }
    setProblem(result);
    setDigits("");
    shake.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.4 } });
  }

  // A laptop at the presenter's desk can type the PIN too.
  const pressRef = useRef(press);
  useEffect(() => {
    pressRef.current = press;
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (/^\d$/.test(event.key)) pressRef.current(event.key);
      if (event.key === "Backspace") pressRef.current("delete");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const message =
    problem === "wrong" ? text.pinWrong : problem === "locked" ? text.pinLocked : text.failed;
  return (
    <main className="pb-safe relative flex h-full flex-col items-center px-4 pt-12">
      <div className="absolute top-3 right-4">
        <LanguageSwitch />
      </div>
      <Art name="shop" size={128} eager />
      <p className="mt-4 text-sm font-semibold text-ink-muted">{shopName}</p>
      <h1 className="mt-1 text-center text-title font-extrabold tracking-tight">{text.pinTitle}</h1>
      <motion.div animate={shake} aria-hidden className="mt-8 flex gap-4">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            className={cn(
              "size-4 rounded-full transition-colors",
              index < digits.length ? "bg-ink" : "bg-surface-pressed",
            )}
          />
        ))}
      </motion.div>
      <p role="alert" className="mt-4 h-5 text-sm font-medium text-danger">
        {problem && message}
      </p>
      <div className="mt-auto grid w-full max-w-xs grid-cols-3 gap-3 pb-8">
        {KEYS.map((key) =>
          key === "" ? (
            <span key="blank" />
          ) : (
            <button
              key={key}
              type="button"
              aria-label={key === "delete" ? text.pinDelete : key}
              onClick={() => press(key)}
              className="grid h-16 place-items-center rounded-2xl bg-surface-muted text-2xl font-semibold tabular-nums transition-transform active:scale-95 active:bg-surface-pressed"
            >
              {key === "delete" ? <Delete aria-hidden className="size-6" /> : key}
            </button>
          ),
        )}
      </div>
    </main>
  );
}
