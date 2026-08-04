# DoraHacks BUIDL — ProofYield (paste-ready)

Hackathon: [BUIDL CTC 2026 Fall](https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail)  
Submit: DoraHacks → Submit BUIDL → attach this project to the hackathon.

Do **not** film `.env`, private keys, or API secrets.

---

## Paste into DoraHacks form

### Project name
```
ProofYield
```

### Project sector
```
DeFi, RWA, AI
```

### Project description (short — ~500 chars)
```
ProofYield is an Attestcoin-proven RWA yield vault on Creditcoin CC3.
Deposit pyUSD once → an AI allocator ranks Sepolia RWA desks → Attestcoin proves CouponPaid inclusion on CC3 → ProofYieldVault harvests and NAV rises.
No bridges. No centralized oracles. Share price only moves after a verified proof.
Live testnet: ERC-4626 vault, faucet, wallet deposit/redeem, proofs ledger, and explorer-linked contracts.
```

### Project description (long — full BUIDL body)
```
## What it is
ProofYield is the deposit layer for RWA yield on Creditcoin. Users deposit test pyUSD into an ERC-4626 vault on CC3. Real-world coupon events are posted on Sepolia; an agent observes them, runs an AI/policy allocator, proves inclusion with Attestcoin (@gluwa/usc-sdk), then calls harvestTrusted so share price only rises after verification.

## Why Creditcoin
Attestcoin (USC) lets us treat Sepolia cashflow events as verifiable facts on CC3 without a trusted bridge or oracle. That is the primitive CTC DeFi needs for RWA.

## Live demo (testnet)
- Web: https://proofyield-web-production.up.railway.app
- API: https://proofyield-api-production.up.railway.app (mode: live)
- Contracts tab: vault, pyUSD asset, Sepolia RWA source — each with explorer links

## Architecture
observe (Sepolia CouponPaid)
  → decide (allocator policy / AI rationale)
  → Attestcoin prove
  → harvest (ProofYieldVault)
  → audit (proofs ledger)

## Proof txs
See docs/proofs/testnet-txs.md in the repo (Sepolia CouponPaid + CC3 harvestTrusted).

## Stack
Foundry contracts · Node agent · Next.js app · Railway deploy · MetaMask on CC3
```

### GitHub repository URL
```
https://github.com/darkty0x/proofyield
```

### Demo / prototype URL
```
https://proofyield-web-production.up.railway.app
```

### Project deck / whitepaper URL
```
https://proofyield-web-production.up.railway.app/docs
```

### Alternate deck source (markdown)
```
https://github.com/darkty0x/proofyield/blob/main/docs/ceip-deck.md
```

### Explorer proof links (organizer Q / notes field)
```
Sepolia RWA source:
https://sepolia.etherscan.io/address/0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB

CouponPaid $500:
https://sepolia.etherscan.io/tx/0x5a8b6d6ee97ea486735f7a0ce840d213ba7bf3cd43a10c8cac16b2d0568eaeac

CouponPaid $100:
https://sepolia.etherscan.io/tx/0x88447ed2ed22d0f1db5b57b74b01d317c7e64af7bdf121dc508a0770c2235232

CC3 vault:
https://creditcoin-testnet.blockscout.com/address/0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc

harvestTrusted $500 → NAV 1.005:
https://creditcoin-testnet.blockscout.com/tx/0x803c4cdb9eebbd4c0bde1b9ff38a6530a56ea7ac70d2091df6e00002e6564ade

harvestTrusted $100 → NAV 1.006:
https://creditcoin-testnet.blockscout.com/tx/0x901ac5d3e8c015b8a409ee8f42d6efbbfa1085ac2d4859ab32e5717abd0dd30d

Deployments JSON API:
https://proofyield-api-production.up.railway.app/api/deployments
```

### Prototype demo video URL
```
<PASTE after upload — YouTube / Loom / Google Drive public>
```

### Attestcoin integration (organizer question if asked)
```
Every yield accrual requires an Attestcoin-proven Sepolia CouponPaid tx.
The agent waits for CC3 attestation, builds inclusion proofs with @gluwa/usc-sdk,
and ProofYieldVault harvestTrusted verifies before accruing into the ERC-4626 vault.
NAV never moves on faith.
```

### Tags / keywords
```
Creditcoin, Attestcoin, RWA, DeFi, ERC-4626, Sepolia, CC3, AI allocator
```

---

## Demo video shot list (≤3 min · Live production)

**Prep**
- Open https://proofyield-web-production.up.railway.app
- MetaMask on Creditcoin Testnet (CC3), hide bookmarks, zoom 100–110%
- Have Blockscout + Sepolia Etherscan tabs ready (local browser)
- Confirm dashboard badge says **Live**

| # | Time | Shot | Say / show |
|---|------|------|------------|
| 1 | 0:00–0:15 | Landing hero | “ProofYield — RWA yield, Attestcoin-proven on Creditcoin.” Point at **Live**, APY, TVL. |
| 2 | 0:15–0:35 | Open vault app → Connect | Connect wallet → switch to CC3 if prompted. |
| 3 | 0:35–0:55 | Get test pyUSD → Deposit | Faucet → enter amount → Deposit pyUSD. Show approve + deposit prompts. |
| 4 | 0:55–1:25 | Portfolio | Shares / position value. Transaction history: **Proven harvest · T-Bill Proxy Desk**. Click Explorer. |
| 5 | 1:25–1:55 | Proofs tab | Expand harvested row: AI rationale → Sepolia hash → CC3 harvest hash. |
| 6 | 1:55–2:15 | Contracts tab | Vault + pyUSD + RWA source with Blockscout / Etherscan links. |
| 7 | 2:15–2:35 | Allocator | Three desks / weights. |
| 8 | 2:35–2:55 | Explorer cutaways | Sepolia CouponPaid + CC3 harvestTrusted (from list above). |
| 9 | 2:55–3:10 | Close on landing or NAV | “Share price only moves after Sepolia coupons are proven on Creditcoin.” |

**Voiceover one-liner (optional VO)**
> Deposit once. Earn RWA coupons. Attestcoin proves them on Creditcoin before NAV updates.

---

## Submit checklist

- [ ] Demo video recorded + uploaded (public URL)
- [ ] Paste fields above into DoraHacks BUIDL
- [ ] Attach hackathon: BUIDL CTC 2026 Fall
- [ ] GitHub README shows live URLs + deployments table
- [ ] Dashboard shows **Live** in the video
- [ ] No `.env` / keys on screen
- [ ] Team member info filled on form

## Team
Fill names / emails / roles on DoraHacks at submit time.
