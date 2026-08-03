# Attestcoin Protocol integration

ProofYield uses Creditcoin’s **Attestcoin Protocol** (formerly USC) so vault share price only moves after a Sepolia RWA coupon is cryptographically proven on CC3.

## Why Attestcoin

Centralized oracles can fake RWA yield. Attestcoin attests foreign-chain history and verifies inclusion proofs on Creditcoin via the Native Query Verifier precompile `0x…0FD2`.

## Flow

1. Owner posts `CouponPaid` on Sepolia `RwaYieldSource`.
2. Agent observes the log, runs AI allocation policy (`accept` / `reject`).
3. On accept, agent calls `@gluwa/usc-sdk` `ProofBuilder`:
   - `waitUntilHeightAttested(chainKey, blockNumber)`
   - `getProof(txHash)`
   - optional `PrecompileBlockProver.verifySingle` on CC3
4. Harvest entrypoints on `ProofYieldVault`:
   - **Preferred live path:** `execute(...)` (inherits `USCBase`) — verifies inclusion proof on-chain, decodes coupon, mints underlying into the vault.
   - **Operational path:** `harvestTrusted(...)` for the allowlisted harvester after off-chain verify (demo + early testnet).

## Configuration

| Env | Purpose |
|-----|---------|
| `ATTESTCOIN_PROVER_URL` | `https://prover.cc3-testnet.creditcoin.network` |
| `CREDITCOIN_RPC_URL` | `https://rpc.cc3-testnet.creditcoin.network` |
| `SEPOLIA_CHAIN_KEY` | `1` on CC3 testnet |
| `PROOFYIELD_MODE=live` | Disable mock proofs |

## Developer references

- https://docs.creditcoin.org/creditcoin-usc
- https://docs.creditcoin.org/creditcoin-usc/dapp-builder-infrastructure/usc-sdk
- https://docs.creditcoin.org/creditcoin-usc/usc-chains-environments
- Dashboard: https://dashboard.cc3-testnet.creditcoin.network/

## Scoring note for judges

Depth of Attestcoin utilization is a core criterion. ProofYield gates **all yield accrual** on proven coupons — deposits alone never inflate APY.
