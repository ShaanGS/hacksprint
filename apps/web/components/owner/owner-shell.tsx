"use client";

import { useState } from "react";
import { OrdersApp } from "@/components/owner/orders-app";
import { OwnerApp } from "@/components/owner/owner-app";
import { OwnerLanguage } from "@/components/owner/owner-language";
import { PinScreen } from "@/components/owner/pin-screen";
import { useOwnerVoice } from "@/components/owner/use-owner-voice";
import type { Lang } from "@/lib/i18n/languages";

/**
 * The owner's phone: the PIN first, then the app. The speaker and microphone live here, so the
 * PIN taps that sign the owner in also allow the sound and the mic.
 */
export function OwnerShell({
  screen,
  signedIn,
  shopId,
  demo,
  ownerLang,
  ownerName,
  shopName,
}: {
  /** The money app, or the frozen order approval screen. */
  screen: "money" | "orders";
  signedIn: boolean;
  shopId: string;
  demo: boolean;
  ownerLang: Lang;
  ownerName: string;
  shopName: string;
}) {
  const [inside, setInside] = useState(signedIn);
  const voice = useOwnerVoice();
  const signOut = () => setInside(false);
  return (
    <OwnerLanguage lang={ownerLang}>
      {!inside ? (
        <PinScreen
          shopName={shopName}
          onKeyTap={voice.unlockSound}
          onSignedIn={() => {
            setInside(true);
            voice.askMicrophone();
          }}
        />
      ) : screen === "orders" ? (
        <OrdersApp ownerName={ownerName} voice={voice} onSignedOut={signOut} />
      ) : (
        <OwnerApp shopId={shopId} demo={demo} voice={voice} onSignedOut={signOut} />
      )}
    </OwnerLanguage>
  );
}
