"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Art, Banner } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { normalizePhone } from "@/lib/customer/phone";
import { langInfo, langs, type Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";

export type Details = { lang: Lang; name: string; phone: string };

// The first letter of each script: what a customer looks for before they can read the rest.
const firstLetter: Record<Lang, string> = { ta: "அ", hi: "अ", kn: "ಅ", en: "A" };

/** C0: two calm steps. Pick a language with one tap, then give a name and phone once. */
export function Welcome({
  shopName,
  onStart,
}: {
  shopName: string;
  onStart: (details: Details) => void;
}) {
  const [lang, setLang] = useState<Lang | null>(null);
  if (!lang) return <ChooseLanguage shopName={shopName} onChoose={setLang} />;
  return (
    <YourDetails shopName={shopName} lang={lang} onBack={() => setLang(null)} onStart={onStart} />
  );
}

function ChooseLanguage({
  shopName,
  onChoose,
}: {
  shopName: string;
  onChoose: (lang: Lang) => void;
}) {
  return (
    <main className="flex min-h-full flex-col">
      <div className="h-64 shrink-0 overflow-hidden rounded-b-3xl">
        <Banner name="voice" flush />
      </div>
      <div className="pb-safe flex flex-1 flex-col px-4 pt-6">
        <h1 className="text-display font-extrabold tracking-tight">{shopName}</h1>
        <p className="mt-1 text-lg font-medium">{textFor("en").chooseLanguage}</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          {(["ta", "hi", "kn"] as const).map((code) => textFor(code).chooseLanguage).join("  ·  ")}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {langs.map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              onClick={() => onChoose(code)}
              className="flex min-h-28 flex-col justify-between rounded-2xl bg-surface-muted p-4 text-left transition-transform active:scale-97"
            >
              <span aria-hidden className="text-display leading-none font-extrabold">
                {firstLetter[code]}
              </span>
              <span className="text-lg font-semibold">{langInfo[code].name}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

const fieldClass =
  "mt-2 flex min-h-14 items-center rounded-lg bg-surface-muted px-4 focus-within:outline-2 focus-within:outline-ink";

function YourDetails({
  shopName,
  lang,
  onBack,
  onStart,
}: {
  shopName: string;
  lang: Lang;
  onBack: () => void;
  onStart: (details: Details) => void;
}) {
  const t = textFor(lang);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneWrong, setPhoneWrong] = useState(false);

  function start() {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setPhoneWrong(true);
      return;
    }
    onStart({ lang, name: name.trim(), phone: normalized });
  }

  return (
    <main lang={lang} className="pb-safe flex min-h-full flex-col px-4 pt-4">
      <button
        type="button"
        aria-label={t.back}
        onClick={onBack}
        className="grid size-11 place-items-center rounded-full bg-surface-muted active:scale-95"
      >
        <ArrowLeft aria-hidden className="size-5" />
      </button>
      <div className="mt-6 flex items-center gap-4">
        <Art name="shop" size={88} eager />
        <h1 className="text-title font-extrabold tracking-tight">{shopName}</h1>
      </div>

      <label className="mt-8 block text-base font-semibold">
        {t.yourName}
        <span className={fieldClass}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className="w-full bg-transparent text-lg outline-none"
          />
        </span>
      </label>
      <label className="mt-5 block text-base font-semibold">
        {t.phone}
        <span className={fieldClass}>
          <span className="mr-2 text-lg text-ink-muted">+91</span>
          <input
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setPhoneWrong(false);
            }}
            inputMode="tel"
            autoComplete="tel-national"
            aria-invalid={phoneWrong}
            className="w-full bg-transparent text-lg tabular-nums outline-none"
          />
        </span>
      </label>
      {phoneWrong && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {t.phoneInvalid}
        </p>
      )}

      <div className="mt-auto pt-8">
        <Button wide disabled={!name.trim() || !phone.trim()} onClick={start}>
          {t.start}
        </Button>
      </div>
    </main>
  );
}
