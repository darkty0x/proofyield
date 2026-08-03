"use client";

import { useWallet } from "@/lib/wallet";
import styles from "./app.module.css";

export function WalletButton() {
  const {
    connected,
    connecting,
    shortAddress,
    onCc3,
    error,
    connect,
    disconnect,
    switchToCc3,
  } = useWallet();

  if (!connected) {
    return (
      <div className={styles.walletWrap}>
        <button
          type="button"
          className={styles.walletBtn}
          onClick={() => void connect()}
          disabled={connecting}
        >
          {connecting ? "Connecting…" : "Connect wallet"}
        </button>
        {error ? <span className={styles.walletErr}>{error}</span> : null}
      </div>
    );
  }

  return (
    <div className={styles.walletWrap}>
      {!onCc3 ? (
        <button type="button" className={styles.walletWarn} onClick={() => void switchToCc3()}>
          Switch to CC3
        </button>
      ) : null}
      <button type="button" className={styles.walletConnected} onClick={disconnect} title="Disconnect">
        <i className={styles.dotLive} />
        {shortAddress}
      </button>
      {error ? <span className={styles.walletErr}>{error}</span> : null}
    </div>
  );
}
