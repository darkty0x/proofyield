#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"

: "${DEPLOYER_PRIVATE_KEY:?set DEPLOYER_PRIVATE_KEY}"
TARGET="${1:-creditcoin}"

if [[ "$TARGET" == "sepolia" ]]; then
  : "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL}"
  DEPLOY_TARGET=sepolia forge script script/Deploy.s.sol:DeployProofYield \
    --rpc-url "$SEPOLIA_RPC_URL" --broadcast -vvvv
else
  : "${CREDITCOIN_RPC_URL:?set CREDITCOIN_RPC_URL}"
  forge script script/Deploy.s.sol:DeployCreditcoinStack \
    --rpc-url "$CREDITCOIN_RPC_URL" --broadcast -vvvv
fi
