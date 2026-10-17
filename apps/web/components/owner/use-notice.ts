import { useCallback, useRef, useState } from "react";

const NOTICE_MS = 4000;

/** A short message at the top of the owner's screen that clears itself. */
export function useNotice(): [string | null, (text: string) => void] {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setNotice(text);
    timer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);
  return [notice, show];
}
