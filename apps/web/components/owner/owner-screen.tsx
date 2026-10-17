"use client";

import { createContext, useContext } from "react";

// What every owner tab may need from the app around it, without passing it down each level.

/** The jobs the owner can hand to an agent. */
export type AgentKind = "collect" | "reorder";

export type OwnerScreen = {
  /** The shop runs on seeded demo data: label it and offer the stage fallbacks (rule 12). */
  demo: boolean;
  /** A short message at the top of the screen. */
  notify: (message: string) => void;
  openDemoTools: () => void;
  openAgent: (agent: AgentKind) => void;
};

export const OwnerScreenContext = createContext<OwnerScreen>({
  demo: false,
  notify: () => undefined,
  openDemoTools: () => undefined,
  openAgent: () => undefined,
});

export function useOwnerScreen(): OwnerScreen {
  return useContext(OwnerScreenContext);
}
