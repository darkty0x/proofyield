#!/usr/bin/env bash
# After CC3 deploy: push env to Railway API service and print next E2E steps.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
set -a; source .env; set +a

: "${CREDITCOIN_VAULT:?CREDITCOIN_VAULT unset — run node scripts/deploy-cc3.mjs first}"
: "${CREDITCOIN_ASSET:?CREDITCOIN_ASSET unset}"
: "${SEPOLIA_RWA_SOURCE:?SEPOLIA_RWA_SOURCE unset}"
: "${HARVESTER_PRIVATE_KEY:?HARVESTER_PRIVATE_KEY unset}"

echo "Setting Railway live vars (proofyield-api)…"
railway variables set \
  PROOFYIELD_MODE=live \
  SEPOLIA_RWA_SOURCE="$SEPOLIA_RWA_SOURCE" \
  CREDITCOIN_VAULT="$CREDITCOIN_VAULT" \
  CREDITCOIN_ASSET="$CREDITCOIN_ASSET" \
  HARVESTER_PRIVATE_KEY="$HARVESTER_PRIVATE_KEY" \
  DEPLOYER_PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY" \
  SEPOLIA_RPC_URL="${SEPOLIA_RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}" \
  CREDITCOIN_RPC_URL="${CREDITCOIN_RPC_URL:-https://rpc.cc3-testnet.creditcoin.network}" \
  ATTESTCOIN_PROVER_URL="${ATTESTCOIN_PROVER_URL:-https://prover.cc3-testnet.creditcoin.network}" \
  SEPOLIA_CHAIN_KEY="${SEPOLIA_CHAIN_KEY:-1}" \
  FAUCET_AMOUNT="${FAUCET_AMOUNT:-10000}" \
  FAUCET_COOLDOWN_MS="${FAUCET_COOLDOWN_MS:-60000}" \
  --service proofyield-api

echo
echo "Next:"
echo "  1. Wait for Railway redeploy"
echo "  2. node scripts/beta-smoke.mjs https://proofyield-api-production.up.railway.app"
echo "  3. npm run post-coupon -w @proofyield/agent -- 2 500000000 beta-live-1"
echo "  4. Watch /api/proofs until harvested"
echo
echo "Sepolia prep coupon already posted:"
echo "  https://sepolia.etherscan.io/tx/0x5a8b6d6ee97ea486735f7a0ce840d213ba7bf3cd43a10c8cac16b2d0568eaeac"
