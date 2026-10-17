import { useEffect, useState } from "react";
import type { OwnerBackend } from "@/lib/owner/backend";
import type { HomeNumbers } from "@/lib/sources/types";

/** Today's home numbers, fetched each time the Home tab opens. */
export function useHome(backend: OwnerBackend): HomeNumbers | null {
  const [numbers, setNumbers] = useState<HomeNumbers | null>(null);
  useEffect(() => {
    let current = true;
    backend.home().then(
      (next) => {
        if (current) setNumbers(next);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [backend]);
  return numbers;
}
