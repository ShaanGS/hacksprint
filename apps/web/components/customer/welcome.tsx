"use client";

import { useState } from "react";
import { Art } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { normalizePhone } from "@/lib/customer/phone";
import { langInfo, langs, type Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";

export type Details = { lang: Lang; name: string; phone: string };

const inputClass =
  "mt-2 block min-h-14 w-full rounded-lg bg-surface-muted px-4 text-lg outline-none focus:outline-2 focus:outline-ink";

/** C0: pick a language, then name and phone once. Every label switches to the chosen language. */
export function Welcome({
  shopName,
  onStart,
}: {
  shopName: string;
  onStart: (details: Details) => void;
}) {
  const [lang, setLang] = useState<Lang>("ta");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneWrong, setPhoneWrong] = useState(false);
  const t = textFor(lang);

  function start() {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setPhoneWrong(true);
      return;
    }
    onStart({ lang, name: name.trim(), phone: normalized });
  }

  return (
    <main className="flex min-h-full flex-col px-4 pt-8 pb-6">
      <Art name="shop" size={96} />
      <h1 className="mt-3 text-title font-bold">{shopName}</h1>
      <p lang={lang} className="mt-1 text-base text-ink-muted">
        {t.trySaying}
      </p>

      <h2 lang={lang} className="mt-8 text-xl font-bold">
        {t.chooseLanguage}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {langs.map((code) => (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={lang === code}
            onClick={() => setLang(code)}
            className={cn(
              "min-h-14 rounded-xl text-lg font-medium transition-colors",
              lang === code ? "bg-accent text-accent-ink" : "bg-surface-muted text-ink",
            )}
          >
            {langInfo[code].name}
          </button>
        ))}
      </div>

      <label lang={lang} className="mt-8 block text-base font-medium">
        {t.yourName}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          className={inputClass}
        />
      </label>
      <label lang={lang} className="mt-4 block text-base font-medium">
        {t.phone}
        <input
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setPhoneWrong(false);
          }}
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={phoneWrong}
          className={inputClass}
        />
      </label>
      {phoneWrong && (
        <p lang={lang} role="alert" className="mt-2 text-sm font-medium text-danger">
          {t.phoneInvalid}
        </p>
      )}

      <div className="mt-auto pt-8">
        <Button wide lang={lang} disabled={!name.trim() || !phone.trim()} onClick={start}>
          {t.start}
        </Button>
      </div>
    </main>
  );
}
