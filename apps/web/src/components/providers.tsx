"use client";

import { ThemeProvider } from "./theme";
import { WalletProvider } from "./wallet-provider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>{children}</WalletProvider>
    </ThemeProvider>
  );
}
