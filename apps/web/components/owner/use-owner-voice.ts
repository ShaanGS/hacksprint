import { useRef, useState } from "react";
import { createPlayer, type Player } from "@/lib/audio/player";
import { createRecorder, openMicrophone, type Recorder } from "@/lib/audio/recorder";

// The owner phone's speaker and microphone. A new order rings, then is spoken in the owner's
// language (spec A2, A6); announcements wait their turn so two orders never talk over each other.

const CHIME = "/sounds/new-order.mp3";

export type OwnerVoice = {
  soundOn: boolean;
  /** The microphone is allowed and open, so holding the mic records at once. */
  micOn: boolean;
  /** Call inside a tap, before any await. */
  unlockSound(): void;
  /** Asks for the microphone once; holding the mic before it is allowed asks again. */
  askMicrophone(): Promise<Recorder | null>;
  /** Rings, then plays the spoken order if there is one. */
  announce(speechUrl: string | null): void;
};

/** Fetches the spoken order while the chime plays, so it starts the moment the chime ends. */
async function fetchSpeech(url: string): Promise<string | null> {
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;
  return URL.createObjectURL(await response.blob());
}

export function useOwnerVoice(): OwnerVoice {
  const player = useRef<Player | null>(null);
  const recorder = useRef<Recorder | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [soundOn, setSoundOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  return {
    soundOn,
    micOn,
    unlockSound() {
      player.current ??= createPlayer();
      player.current.unlock().then(setSoundOn);
    },
    async askMicrophone() {
      if (recorder.current) return recorder.current;
      const stream = await openMicrophone().catch(() => null);
      recorder.current = stream ? createRecorder(stream) : null;
      setMicOn(recorder.current !== null);
      return recorder.current;
    },
    announce(speechUrl) {
      const speaker = player.current;
      if (!speaker?.unlocked) return;
      const speech = speechUrl ? fetchSpeech(speechUrl) : Promise.resolve(null);
      queue.current = queue.current.then(async () => {
        await speaker.play(CHIME);
        const url = await speech;
        if (!url) return;
        await speaker.play(url);
        URL.revokeObjectURL(url);
      });
    },
  };
}
