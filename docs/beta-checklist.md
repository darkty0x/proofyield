# Beta acceptance checklist (testnet)

Complete after deploy + `PROOFYIELD_MODE=live` on the agent.

## Deploy

```bash
# 1) Sepolia source
cd contracts
export DEPLOYER_PRIVATE_KEY=0x...
export SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
DEPLOY_TARGET=sepolia forge script script/Deploy.s.sol:DeployProofYield \
  --rpc-url "$SEPOLIA_RPC_URL" --broadcast -vvvv
# Record RwaYieldSource

# 2) CC3 vault + asset (ethers — forge script fails CC3 prevrandao validation)
# Fund deployer via Discord #token-faucet: /faucet address:0xYOUR
export HARVESTER_ADDRESS=0x...   # agent wallet (defaults to deployer)
node scripts/deploy-cc3.mjs
# Writes deployments/testnet.json + prints CREDITCOIN_ASSET / CREDITCOIN_VAULT
```

Set Railway / `.env`: `PROOFYIELD_MODE=live`, addresses, `HARVESTER_PRIVATE_KEY`.

## E2E

1. `GET /health` → `{ mode: "live" }`
2. `GET /api/status` → `live: true`, non-empty `vaultAddress` / `assetAddress`
3. Web: Connect MetaMask → Switch to CC3
4. **Get test pyUSD** → explorer transfer/mint tx
5. **Deposit** → approve + deposit txs; portfolio shares > 0
6. Post coupon:
   ```bash
   npm run post-coupon -w @proofyield/agent -- 2 1000000000 beta-coupon-1
   ```
7. Wait for agent poll + Attestcoin + `harvestTrusted`
8. Proofs tab: real Sepolia + CC3 hashes (no templates)
9. NAV / share price up on `/api/status`
10. **Withdraw** redeem → pyUSD returned
11. Dashboard badge shows **Live**

Record explorer URLs for hackathon submission.
