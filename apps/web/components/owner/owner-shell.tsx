"use client";

import { useState } from "react";
import { OwnerApp } from "@/components/owner/owner-app";
import { OwnerLanguage } from "@/components/owner/owner-language";
import { PinScreen } from "@/components/owner/pin-screen";
import { useOwnerVoice } from "@/components/owner/use-owner-voice";
import type { Lang } from "@/lib/i18n/languages";
import { liveOwner } from "@/lib/owner/live";
import { previewOwner } from "@/lib/preview/owner-backend";

/**
 * The owner's phone: the PIN first on a live shop, then the app. The speaker and microphone live
 * here, so the PIN taps that sign the owner in also turn the sound on.
 */
export function OwnerShell({
  live,
  signedIn,
  ownerLang,
  ownerName,
  shopName,
}: {
  live: boolean;
  signedIn: boolean;
  ownerLang: Lang;
  ownerName: string;
  shopName: string;
}) {
  const [inside, setInside] = useState(signedIn || !live);
  const [backend] = useState(() => (live ? liveOwner : previewOwner()));
  const voice = useOwnerVoice();
  return (
    <OwnerLanguage lang={ownerLang}>
      {inside ? (
        <OwnerApp
          live={live}
          backend={backend}
          ownerName={ownerName}
          voice={voice}
          onSignedOut={() => setInside(false)}
        />
      ) : (
        <PinScreen
          shopName={shopName}
          onKeyTap={voice.unlockSound}
          onSignedIn={() => {
            setInside(true);
            voice.askMicrophone();
          }}
        />
      )}
    </OwnerLanguage>
  );
}
