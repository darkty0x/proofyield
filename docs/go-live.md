# Go-live checklist

See also [beta-checklist.md](./beta-checklist.md) for the full wallet E2E.

## 1. Keys & RPCs

Copy `.env.example` → `.env`. Fund deployer/harvester on Sepolia + Creditcoin CC3 testnet. Never commit secrets.

Set `PROOFYIELD_MODE=live`.

## 2. Deploy Sepolia source

```bash
cd contracts
export DEPLOYER_PRIVATE_KEY=...
export SEPOLIA_RPC_URL=...
DEPLOY_TARGET=sepolia forge script script/Deploy.s.sol:DeployProofYield \
  --rpc-url $SEPOLIA_RPC_URL --broadcast -vvvv
```

Record `RwaYieldSource` → `SEPOLIA_RWA_SOURCE`.

## 3. Deploy Creditcoin vault

Foundry `forge script` currently fails CC3 header validation (`prevrandao`). Use the ethers deployer instead.

Fund the deployer with tCTC first (Discord `#token-faucet`):

```text
/faucet address:0xYOUR_DEPLOYER
```

Then:

```bash
export CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
export SEPOLIA_RWA_SOURCE=0x...
export HARVESTER_ADDRESS=0x...   # agent wallet
node scripts/deploy-cc3.mjs
```

This deploys `MockUSDC` + `ProofYieldVault`, seeds faucet inventory, sets minters, and writes `deployments/testnet.json`.

## 4. Agent live

```bash
PROOFYIELD_MODE=live
HARVESTER_PRIVATE_KEY=...
SEPOLIA_RWA_SOURCE=...
CREDITCOIN_VAULT=...
CREDITCOIN_ASSET=...
npm run start -w @proofyield/agent
```

Post a coupon:

```bash
npm run post-coupon -w @proofyield/agent -- 2 1000000000 invoice-live-1
```

Wait for attestation (can take minutes), then confirm harvest in `/api/proofs` and share price on vault.

## 5. Web

```bash
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
npm run build -w @proofyield/web && npm run start -w @proofyield/web
```

Confirm UI badge shows **Live**. Use **Get test pyUSD** then wallet **Deposit** / **Withdraw** (not demo API).

## 6. Proof artifacts for submission

- Sepolia coupon tx URL
- CC3 harvest / vault URL
- Short Attestcoin integration summary (`docs/attestcoin-integration.md`)
- Demo video per `docs/demo-script.md`
