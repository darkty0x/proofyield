# DoraHacks BUIDL fields (draft)

**Project name:** ProofYield

**Sector:** DeFi (also RWA + AI)

**Description:**

> ProofYield is the RWA yield vault for Creditcoin. Deposit once, earn real coupons proven from Sepolia via the Attestcoin Protocol, and let an AI allocator maximize risk-adjusted APY — no centralized oracle. Built as the deposit layer future CTC DeFi will compose on.

**Attestcoin Protocol integration summary:**

> Every yield accrual calls through Attestcoin-proven Sepolia `CouponPaid` transactions. The agent waits for CC3 attestation, builds inclusion proofs with `@gluwa/usc-sdk`, and the `ProofYieldVault` USC path verifies via the Native Query Verifier precompile before minting underlying into the ERC-4626 vault. Deposits never inflate APY without a verified coupon.

**Links to prepare**

- GitHub (this repo) + README
- Live web + API
- Demo video URL
- Deck/PDF (`docs/ceip-deck.md` outline)
- Explorer proof txs after go-live

**Team:** fill on DoraHacks form at submit time.
