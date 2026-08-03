"use client";

import { useCallback, useEffect, useState } from "react";

export type WalletState = {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

/** Creditcoin CC3 testnet */
export const CC3_CHAIN_ID = 102031;
export const CC3_HEX = "0x18e8f";

const CC3_PARAMS = {
  chainId: CC3_HEX,
  chainName: "Creditcoin Testnet (CC3)",
  nativeCurrency: { name: "tCTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: ["https://rpc.cc3-testnet.creditcoin.network"],
  blockExplorerUrls: ["https://creditcoin-testnet.blockscout.com"],
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const [accounts, chain] = await Promise.all([
        window.ethereum.request({ method: "eth_accounts" }) as Promise<string[]>,
        window.ethereum.request({ method: "eth_chainId" }) as Promise<string>,
      ]);
      setAddress(accounts[0] ?? null);
      setChainId(parseInt(chain, 16));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void sync();
    const eth = window.ethereum;
    if (!eth?.on) return;
    const onAccounts = (accs: unknown) => {
      const list = accs as string[];
      setAddress(list[0] ?? null);
    };
    const onChain = (id: unknown) => setChainId(parseInt(String(id), 16));
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [sync]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("No wallet found — install MetaMask or another injected wallet");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      setAddress(accounts[0] ?? null);
      const chain = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(parseInt(chain, 16));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection rejected");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  const switchToCc3 = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CC3_HEX }],
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [CC3_PARAMS],
        });
      } else {
        setError(err instanceof Error ? err.message : "Network switch failed");
      }
    }
  }, []);

  return {
    address,
    chainId,
    connecting,
    error,
    connected: Boolean(address),
    onCc3: chainId === CC3_CHAIN_ID,
    shortAddress: address ? shortAddr(address) : null,
    connect,
    disconnect,
    switchToCc3,
  };
}
