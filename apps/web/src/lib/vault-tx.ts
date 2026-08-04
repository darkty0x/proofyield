"use client";

import { CC3_CHAIN_ID, CC3_HEX } from "./wallet";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
] as const;

const VAULT_ABI = [
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function asset() view returns (address)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
] as const;

/** Minimal ABI encode helpers (no viem) for the few calls we need. */
function padAddr(addr: string): string {
  return addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function padUint(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

function selector(sig: string): string {
  // keccak256 first 4 bytes — precomputed for our ABIs
  const map: Record<string, string> = {
    "approve(address,uint256)": "095ea7b3",
    "allowance(address,address)": "dd62ed3e",
    "balanceOf(address)": "70a08231",
    "decimals()": "313ce567",
    "deposit(uint256,address)": "6e553f65",
    "redeem(uint256,address,address)": "ba087652",
    "previewDeposit(uint256)": "ef8b30f7",
    "previewRedeem(uint256)": "4cdad506",
    "asset()": "38d52e0f",
  };
  const s = map[sig];
  if (!s) throw new Error(`unknown selector ${sig}`);
  return s;
}

async function ethCall(to: string, data: string): Promise<string> {
  if (!window.ethereum) throw new Error("No wallet");
  return (await window.ethereum.request({
    method: "eth_call",
    params: [{ to, data }, "latest"],
  })) as string;
}

async function ethSend(from: string, to: string, data: string): Promise<string> {
  if (!window.ethereum) throw new Error("No wallet");
  return (await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from, to, data, value: "0x0" }],
  })) as string;
}

async function waitReceipt(txHash: string, timeoutMs = 120_000): Promise<{ status: string }> {
  if (!window.ethereum) throw new Error("No wallet");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const receipt = (await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    })) as { status?: string } | null;
    if (receipt?.status) return { status: receipt.status };
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Transaction confirmation timeout");
}

function decodeUint(hex: string): bigint {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!h || /^0+$/.test(h)) return BigInt(0);
  return BigInt(`0x${h}`);
}

export function toAssetRaw(amountHuman: number, decimals = 6): bigint {
  if (!(amountHuman > 0) || !Number.isFinite(amountHuman)) throw new Error("Invalid amount");
  return BigInt(Math.round(amountHuman * 10 ** decimals));
}

export function fromAssetRaw(raw: bigint, decimals = 6): number {
  return Number(raw) / 10 ** decimals;
}

export async function ensureCc3(): Promise<void> {
  if (!window.ethereum) throw new Error("No wallet");
  const chain = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  if (parseInt(chain, 16) === CC3_CHAIN_ID) return;
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
        params: [
          {
            chainId: CC3_HEX,
            chainName: "Creditcoin Testnet (CC3)",
            nativeCurrency: { name: "tCTC", symbol: "tCTC", decimals: 18 },
            rpcUrls: ["https://rpc.cc3-testnet.creditcoin.network"],
            blockExplorerUrls: ["https://creditcoin-testnet.blockscout.com"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function readAssetBalance(asset: string, owner: string): Promise<number> {
  const data = `0x${selector("balanceOf(address)")}${padAddr(owner)}`;
  const out = await ethCall(asset, data);
  return fromAssetRaw(decodeUint(out));
}

export async function readShareBalance(vault: string, owner: string): Promise<number> {
  const data = `0x${selector("balanceOf(address)")}${padAddr(owner)}`;
  const out = await ethCall(vault, data);
  return fromAssetRaw(decodeUint(out));
}

export async function readAllowance(asset: string, owner: string, spender: string): Promise<bigint> {
  const data = `0x${selector("allowance(address,address)")}${padAddr(owner)}${padAddr(spender)}`;
  const out = await ethCall(asset, data);
  return decodeUint(out);
}

export async function approveIfNeeded(
  from: string,
  asset: string,
  vault: string,
  amountRaw: bigint,
): Promise<string | null> {
  const current = await readAllowance(asset, from, vault);
  if (current >= amountRaw) return null;
  const data = `0x${selector("approve(address,uint256)")}${padAddr(vault)}${padUint(amountRaw)}`;
  const tx = await ethSend(from, asset, data);
  await waitReceipt(tx);
  return tx;
}

export async function depositAssets(
  from: string,
  vault: string,
  asset: string,
  amountHuman: number,
): Promise<{ approveTx: string | null; depositTx: string }> {
  await ensureCc3();
  const amountRaw = toAssetRaw(amountHuman);
  const approveTx = await approveIfNeeded(from, asset, vault, amountRaw);
  const data = `0x${selector("deposit(uint256,address)")}${padUint(amountRaw)}${padAddr(from)}`;
  const depositTx = await ethSend(from, vault, data);
  const receipt = await waitReceipt(depositTx);
  if (receipt.status !== "0x1") throw new Error("Deposit transaction reverted");
  return { approveTx, depositTx };
}

/** Redeem by asset amount ≈ shares = assets / sharePrice handled off-chain via share balance fraction. */
export async function redeemShares(
  from: string,
  vault: string,
  sharesHuman: number,
): Promise<{ redeemTx: string }> {
  await ensureCc3();
  const sharesRaw = toAssetRaw(sharesHuman);
  const data = `0x${selector("redeem(uint256,address,address)")}${padUint(sharesRaw)}${padAddr(from)}${padAddr(from)}`;
  const redeemTx = await ethSend(from, vault, data);
  const receipt = await waitReceipt(redeemTx);
  if (receipt.status !== "0x1") throw new Error("Redeem transaction reverted");
  return { redeemTx };
}

export type ChainActivity = {
  id: string;
  kind: "deposit" | "withdraw";
  label: string;
  detail: string;
  amount: string;
  tone: "in" | "out";
  at: string;
  href: string;
};

/** Fetch recent Deposit/Withdraw logs for `owner` (best-effort; may be empty on some RPCs). */
export async function fetchUserVaultActivity(
  vault: string,
  owner: string,
  explorerBase: string,
): Promise<ChainActivity[]> {
  if (!window.ethereum) return [];
  try {
    const latestHex = (await window.ethereum.request({
      method: "eth_blockNumber",
      params: [],
    })) as string;
    const latest = parseInt(latestHex, 16);
    const fromBlock = Math.max(0, latest - 50_000);
    // Deposit(address,address,uint256,uint256) topic0
    const depositTopic = "0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7";
    // Withdraw(address,address,address,uint256,uint256)
    const withdrawTopic = "0xfbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db";
    const ownerTopic = `0x${padAddr(owner)}`;

    const [deps, wds] = await Promise.all([
      window.ethereum.request({
        method: "eth_getLogs",
        params: [
          {
            address: vault,
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: "latest",
            topics: [depositTopic, null, ownerTopic],
          },
        ],
      }) as Promise<Array<{ transactionHash: string; data: string; blockNumber: string }>>,
      window.ethereum.request({
        method: "eth_getLogs",
        params: [
          {
            address: vault,
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: "latest",
            topics: [withdrawTopic, null, null, ownerTopic],
          },
        ],
      }) as Promise<Array<{ transactionHash: string; data: string; blockNumber: string }>>,
    ]);

    const rows: ChainActivity[] = [];
    for (const log of deps ?? []) {
      const assets = fromAssetRaw(decodeUint(log.data.slice(0, 66)));
      rows.push({
        id: `dep-${log.transactionHash}`,
        kind: "deposit",
        label: "Deposited pyUSD",
        detail: "On-chain vault deposit",
        amount: `+$${assets.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
        tone: "in",
        at: new Date().toISOString(),
        href: `${explorerBase}/tx/${log.transactionHash}`,
      });
    }
    for (const log of wds ?? []) {
      const assets = fromAssetRaw(decodeUint(`0x${log.data.slice(2, 66)}`));
      rows.push({
        id: `wd-${log.transactionHash}`,
        kind: "withdraw",
        label: "Withdrew pyUSD",
        detail: "On-chain vault redeem",
        amount: `-$${assets.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
        tone: "out",
        at: new Date().toISOString(),
        href: `${explorerBase}/tx/${log.transactionHash}`,
      });
    }
    return rows;
  } catch {
    return [];
  }
}

// silence unused ABI consts (documentation / future)
void ERC20_ABI;
void VAULT_ABI;
