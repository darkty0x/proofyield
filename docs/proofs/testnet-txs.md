# Testnet proof txs

## Deployed contracts

| Contract | Network | Address | Scan |
|----------|---------|---------|------|
| RWA Yield Source | Sepolia | `0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB` | [Etherscan](https://sepolia.etherscan.io/address/0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB) |
| ProofYield Vault | Creditcoin CC3 | `0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc` | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc) |
| pyUSD (MockUSDC) | Creditcoin CC3 | `0x3a9d9B7467D95abf4EAFb1721838eF999662c1F9` | [Blockscout](https://creditcoin-testnet.blockscout.com/address/0x3a9d9B7467D95abf4EAFb1721838eF999662c1F9) |

Also in [`deployments/testnet.json`](../../deployments/testnet.json).

## Sepolia RWA source
- Contract: https://sepolia.etherscan.io/address/0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB
- CouponPaid (beta-prep-1, source 2, $500): https://sepolia.etherscan.io/tx/0x5a8b6d6ee97ea486735f7a0ce840d213ba7bf3cd43a10c8cac16b2d0568eaeac
- CouponPaid (beta-live-2, source 2, $100): https://sepolia.etherscan.io/tx/0x88447ed2ed22d0f1db5b57b74b01d317c7e64af7bdf121dc508a0770c2235232

## Creditcoin CC3
- Asset (pyUSD): https://creditcoin-testnet.blockscout.com/address/0x3a9d9B7467D95abf4EAFb1721838eF999662c1F9
- Vault: https://creditcoin-testnet.blockscout.com/address/0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc
- Seed deposit ($100k): https://creditcoin-testnet.blockscout.com/tx/0xacfd69b81d03756a8f6f09c6b0535c5db1968ccdd83e1b9a948f7a76c425b634
- harvestTrusted ($500 → NAV 1.005): https://creditcoin-testnet.blockscout.com/tx/0x803c4cdb9eebbd4c0bde1b9ff38a6530a56ea7ac70d2091df6e00002e6564ade
- Faucet mint sample: https://creditcoin-testnet.blockscout.com/tx/0x5dc08732cc30096ca4a3aa878b5c44b6e7d42ee4ca13adf6365d7f12d668098d

## Live surfaces
- API: https://proofyield-api-production.up.railway.app/health → `mode: live`
- Web: https://proofyield-web-production.up.railway.app
- Deployments API: https://proofyield-api-production.up.railway.app/api/deployments
