# ProofYield

Attestcoin-proven RWA yield vault on Creditcoin.

Deposit once → AI allocates to real-world coupons → Attestcoin proves Sepolia cashflows → share price rises on CC3.

Built for [BUIDL CTC 2026 Fall](https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail) (DeFi + RWA + AI).

## Live surfaces

| Surface | URL |
|---------|-----|
| Web | https://proofyield-web-production.up.railway.app |
| API | https://proofyield-api-production.up.railway.app |
| Hackathon | https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail |
| Railway | https://railway.com/project/6a834e34-f234-40c1-80de-90f1c93db49d |

## Live deployments

| Contract | Network | Address | Explorer |
|----------|---------|---------|----------|
| RWA Yield Source | Sepolia | [`0x9c431d…0bCcB`](https://sepolia.etherscan.io/address/0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB) | [Etherscan](https://sepolia.etherscan.io/address/0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB) |
| ProofYield Vault | Creditcoin CC3 | [`0x9C1bF7…7Fccbc`](https://creditcoin-testnet.blockscout.com/address/0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc) | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc) |
| pyUSD (MockUSDC) | Creditcoin CC3 | [`0x3a9d9B…c1F9`](https://creditcoin-testnet.blockscout.com/address/0x3a9d9B7467D95abf4EAFb1721838eF999662c1F9) | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x3a9d9B7467D95abf4EAFb1721838eF999662c1F9) |

Source of truth: [`deployments/testnet.json`](deployments/testnet.json) · proof txs: [`docs/proofs/testnet-txs.md`](docs/proofs/testnet-txs.md)

## Quick start (demo)

```bash
cp .env.example .env
npm install
npm run dev:agent   # :8787
npm run dev:web     # :3000
```

Open http://localhost:3000 — Deposit, then **Prove & harvest**. Dashboard mirrors [Atoma.fi](https://atoma.fi/) layout/motion (dark glowing hero, interlocking APY/TVL, pill CTAs).

## Architecture

```
observe (Sepolia CouponPaid)
  → decide (AI allocator policy)
  → Attestcoin prove (@gluwa/usc-sdk)
  → harvest (ProofYieldVault ERC-4626)
  → audit
```

- `contracts/` — Foundry: `RwaYieldSource`, `MockUSDC`, `ProofYieldVault` (USC + ERC-4626)
- `packages/agent/` — watcher, allocator, Attestcoin proofs, HTTP API
- `apps/web/` — Next.js vault UI
- `docs/` — Attestcoin integration, demo script, CEIP deck

## Modes

| `PROOFYIELD_MODE` | Behavior |
|-------------------|----------|
| `demo` (default) | In-memory TVL + simulated Attestcoin proofs — safe for UI demos |
| `live` | Real Sepolia coupons + CC3 vault + `@gluwa/usc-sdk` prover |

Live non-negotiables: set RPC URLs, keys, `SEPOLIA_RWA_SOURCE`, `CREDITCOIN_VAULT`; never film `.env`.

## Contracts

```bash
cd contracts && forge test
```

Deploy (requires funded keys):

```bash
# Sepolia RWA source
DEPLOY_TARGET=sepolia DEPLOYER_PRIVATE_KEY=0x... forge script script/Deploy.s.sol:DeployProofYield --rpc-url $SEPOLIA_RPC_URL --broadcast

# Creditcoin vault stack
DEPLOYER_PRIVATE_KEY=0x... SEPOLIA_RWA_SOURCE=0x... HARVESTER_ADDRESS=0x... \
  forge script script/Deploy.s.sol:DeployCreditcoinStack --rpc-url $CREDITCOIN_RPC_URL --broadcast
```

See [docs/go-live.md](docs/go-live.md).

## License

MIT
