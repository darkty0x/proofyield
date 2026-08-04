"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useWallet } from "@/lib/wallet";

type WalletCtx = ReturnType<typeof useWallet>;

const Ctx = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return <Ctx.Provider value={wallet}>{children}</Ctx.Provider>;
}

export function useWalletContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWalletContext must be used within WalletProvider");
  return ctx;
}
