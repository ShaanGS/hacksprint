"use client";

import { useEffect, useState } from "react";
import { OrderStatus } from "@/components/customer/order-status";
import { Talk } from "@/components/customer/talk";
import type { Voice } from "@/components/customer/use-conversation";
import { Welcome, type Details } from "@/components/customer/welcome";
import type { CustomerBackend } from "@/lib/customer/backend";
import { liveCustomer, startSession } from "@/lib/customer/live";
import { createPlayer, type Player } from "@/lib/audio/player";
import { createRecorder, openMicrophone } from "@/lib/audio/recorder";
import { isLang } from "@/lib/i18n/languages";
import { previewCustomer } from "@/lib/preview/customer";

type Stage =
  | { name: "loading" }
  | { name: "welcome"; known: Details | null }
  | { name: "talk"; details: Details; backend: CustomerBackend; voice: Voice }
  | { name: "status"; details: Details; backend: CustomerBackend; voice: Voice; number: number };

const silent: Voice = { recorder: null, player: null };

/** The customer's whole visit: welcome, then the voice order, then the order's progress. */
export function OrderApp({ shopName, live }: { shopName: string; live: boolean }) {
  const [stage, setStage] = useState<Stage>(
    live ? { name: "loading" } : { name: "welcome", known: null },
  );

  useEffect(() => {
    if (!live) return;
    let current = true;
    resumeSession().then((next) => {
      if (current) setStage(next);
    });
    return () => {
      current = false;
    };
  }, [live]);

  // Runs inside the Start tap: sound and the microphone are asked for before any network wait,
  // because phones only allow them straight from a tap.
  async function talk(details: Details, player: Player | null = null) {
    if (!live) {
      setStage({
        name: "talk",
        details,
        backend: previewCustomer(details.lang, details.name),
        voice: silent,
      });
      return;
    }
    const speaker = player ?? createPlayer();
    speaker.unlock();
    const microphone = openMicrophone().then(createRecorder, () => null);
    const opening = await startSession(details);
    const recorder = await microphone;
    setStage({
      name: "talk",
      details,
      backend: liveCustomer(details.lang, opening),
      voice: { recorder, player: speaker },
    });
  }

  if (stage.name === "loading") return null;
  if (stage.name === "welcome") {
    return <Welcome shopName={shopName} known={stage.known} onStart={(details) => talk(details)} />;
  }
  if (stage.name === "talk") {
    return (
      <Talk
        lang={stage.details.lang}
        shopName={shopName}
        backend={stage.backend}
        voice={stage.voice}
        onSent={(number) => setStage({ ...stage, name: "status", number })}
      />
    );
  }
  return (
    <OrderStatus
      lang={stage.details.lang}
      shopName={shopName}
      backend={stage.backend}
      number={stage.number}
      onOrderAgain={() => talk(stage.details, stage.voice.player)}
    />
  );
}

/** A returning customer goes back to the order they are waiting on, or starts with their details filled in. */
async function resumeSession(): Promise<Stage> {
  const response = await fetch("/api/customer/session", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return { name: "welcome", known: null };
  const session = (await response.json()) as {
    customer: { name: string; phone: string; lang: string | null } | null;
    activeOrder: number | null;
  };
  if (!session.customer) return { name: "welcome", known: null };
  const details: Details = {
    name: session.customer.name,
    phone: session.customer.phone,
    lang: isLang(session.customer.lang) ? session.customer.lang : "ta",
  };
  if (session.activeOrder === null) return { name: "welcome", known: details };
  const backend = liveCustomer(details.lang, {
    turns: [],
    cart: { lines: [], totalPaise: 0 },
    review: false,
  });
  return { name: "status", details, backend, voice: silent, number: session.activeOrder };
}
