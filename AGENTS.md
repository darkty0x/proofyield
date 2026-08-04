# ProofYield — BUIDL CTC 2026 Fall

| Surface | Notes |
|---------|-------|
| Hackathon | https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail |
| Web | https://proofyield-web-production.up.railway.app |
| API | https://proofyield-api-production.up.railway.app |
| Deployments | https://proofyield-api-production.up.railway.app/api/deployments |
| Contracts UI | https://proofyield-web-production.up.railway.app/#deployments |
| Mandatory | Attestcoin Protocol integration |
| UI reference | https://atoma.fi/ (hero, type, motion, interlocking stats) |

## Live contracts (testnet)

| Contract | Scan |
|----------|------|
| RWA Yield Source (Sepolia) | https://sepolia.etherscan.io/address/0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB |
| ProofYield Vault (CC3) | https://creditcoin-testnet.blockscout.com/address/0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc |
| pyUSD asset (CC3) | https://creditcoin-testnet.blockscout.com/address/0x3a9d9B7467D95abf4EAFb1721838eF999662c1F9 |

Source: `deployments/testnet.json` · proofs: `docs/proofs/testnet-txs.md`

## Non-negotiables

- Live mode uses real Attestcoin proofs (`PROOFYIELD_MODE=live`)
- Dashboard shows **Live** when connected
- Public GitHub + demo video + explorer proof txs
- Never film API keys / `.env`

## Core loop

`observe → decide → Attestcoin prove → harvest → audit`
