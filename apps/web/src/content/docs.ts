export type DocSection = {
  slug: string;
  title: string;
  group: string;
  summary: string;
  body: DocBlock[];
};

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; text: string }
  | { type: "callout"; title: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "quote"; text: string };

export const DOC_NAV: { group: string; items: { slug: string; title: string }[] }[] = [
  {
    group: "Whitepaper",
    items: [
      { slug: "overview", title: "Overview" },
      { slug: "problem", title: "Problem" },
      { slug: "solution", title: "Solution" },
    ],
  },
  {
    group: "Protocol",
    items: [
      { slug: "architecture", title: "Architecture" },
      { slug: "attestcoin", title: "Attestcoin" },
      { slug: "vault", title: "Vault & tokens" },
      { slug: "allocator", title: "Allocator math" },
    ],
  },
  {
    group: "Security",
    items: [
      { slug: "erc4626-security", title: "ERC-4626 attacks" },
      { slug: "security", title: "Trust & controls" },
      { slug: "implementation", title: "Implementation" },
    ],
  },
  {
    group: "Reference",
    items: [
      { slug: "contracts", title: "Contracts" },
      { slug: "roadmap", title: "Roadmap" },
    ],
  },
];

export const DOCS: DocSection[] = [
  {
    slug: "overview",
    title: "Overview",
    group: "Whitepaper",
    summary:
      "ProofYield is an Attestcoin-proven RWA yield vault on Creditcoin. Deposit once; share price rises only after Sepolia coupons are cryptographically proven on CC3.",
    body: [
      {
        type: "quote",
        text: "Share price never moves on faith — only on Attestcoin-verified coupons.",
      },
      {
        type: "p",
        text: "ProofYield is the deposit layer for real-world-asset (RWA) yield on Creditcoin. Users deposit test pyUSD into an ERC-4626 vault on Creditcoin CC3. Coupon cashflows originate on Sepolia. An autonomous agent observes those events, runs an allocation policy, proves inclusion with Attestcoin, then harvests into the vault so NAV updates are auditable on explorers.",
      },
      {
        type: "h2",
        text: "Thesis",
      },
      {
        type: "p",
        text: "Creditcoin’s Attestcoin Protocol can make foreign-chain cashflow events verifiable facts on CC3. ProofYield turns that primitive into a composable ERC-4626 share (pyvUSD) with explicit math for exchange-rate safety, harvest caps, coupon replay protection, and desk allowlisting.",
      },
      {
        type: "h2",
        text: "Document map",
      },
      {
        type: "ul",
        items: [
          "Architecture — component diagram and end-to-end sequence",
          "Attestcoin — prover SDK path and on-chain USC execute",
          "ERC-4626 attacks — inflation / donation math and virtual-share defense",
          "Allocator math — risk scoring and coupon-vs-TVL caps",
          "Implementation — exact hackathon code paths and live addresses",
        ],
      },
      {
        type: "h2",
        text: "Live surfaces",
      },
      {
        type: "table",
        headers: ["Surface", "URL"],
        rows: [
          ["Web app", "https://proofyield-web-production.up.railway.app"],
          ["Docs", "https://proofyield-web-production.up.railway.app/docs"],
          ["API", "https://proofyield-api-production.up.railway.app"],
          ["Deployments API", "https://proofyield-api-production.up.railway.app/api/deployments"],
          ["GitHub", "https://github.com/darkty0x/proofyield"],
        ],
      },
      {
        type: "code",
        text: "observe (Sepolia CouponPaid)\n  → decide (allocator policy)\n  → Attestcoin prove (@gluwa/usc-sdk)\n  → harvest (ProofYieldVault)\n  → audit (proofs ledger)",
      },
    ],
  },
  {
    slug: "problem",
    title: "Problem",
    group: "Whitepaper",
    summary:
      "Creditcoin needs sticky TVL. RWA yield that depends on trusted oracles or naked ERC-4626 exchange rates can be forged or inflated.",
    body: [
      {
        type: "p",
        text: "Two failure modes dominate “RWA vault” demos: (1) APY invented by an oracle or operator dashboard, and (2) ERC-4626 share-price games that steal first depositors via donation / inflation attacks.",
      },
      {
        type: "h2",
        text: "Yield without proof",
      },
      {
        type: "ol",
        items: [
          "Oracle-reported coupons — a single operator publishes false cashflows.",
          "Bridged IOUs — bridging and custodian risk dominate the product.",
          "Emission APY — TVL is rented, not earned from receivables.",
        ],
      },
      {
        type: "h2",
        text: "ERC-4626 without defenses",
      },
      {
        type: "p",
        text: "Naive empty-vault minting uses shares = assets when supply is zero. An attacker deposits 1 wei, donates a huge balance directly to the vault, then victims mint at a poisoned rate and round to zero shares. OpenZeppelin’s virtual offset and harvest-path discipline are required before a vault is “hackathon-ready,” let alone mainnet-ready.",
      },
      {
        type: "callout",
        title: "Design requirement",
        text: "ProofYield must both (a) gate accrual on Attestcoin-proven coupons and (b) use virtual-share math so donations cannot zero out honest depositors.",
      },
    ],
  },
  {
    slug: "solution",
    title: "Solution",
    group: "Whitepaper",
    summary:
      "ERC-4626 vault with virtual-share offset, Attestcoin-gated harvest, desk allowlists, harvest caps, and coupon replay protection.",
    body: [
      {
        type: "p",
        text: "ProofYield packages Attestcoin into a familiar vault UX while encoding exchange-rate and harvest safety in Solidity and policy math.",
      },
      {
        type: "h2",
        text: "Product properties",
      },
      {
        type: "ul",
        items: [
          "ERC-4626 vault on CC3 with _decimalsOffset = 3 (virtual shares)",
          "Sepolia RwaYieldSource emits CouponPaid for allowlisted desks",
          "Agent allocation: risk score + max coupon bps of TVL",
          "Attestcoin prove via @gluwa/usc-sdk before harvest",
          "usedCoupons[sepoliaTxHash‖couponId] prevents double accrual",
          "maxHarvestBps caps each harvest vs current TVL (default 5%)",
          "Pause + ReentrancyGuard on deposit/mint/withdraw/redeem/harvest",
        ],
      },
      {
        type: "quote",
        text: "Deposit once. Earn RWA coupons. Attestcoin proves them on Creditcoin before NAV updates.",
      },
    ],
  },
  {
    slug: "architecture",
    title: "Architecture",
    group: "Protocol",
    summary:
      "Three surfaces: Sepolia cashflow source, CC3 vault + asset, and an agent that observes, decides, proves, and harvests.",
    body: [
      {
        type: "h2",
        text: "Components",
      },
      {
        type: "table",
        headers: ["Component", "Chain", "Role"],
        rows: [
          ["RwaYieldSource", "Sepolia", "Registers desks; emits CouponPaid"],
          ["MockUSDC (pyUSD)", "CC3", "Deposit asset / faucet / harvest mint"],
          ["ProofYieldVault", "CC3", "ERC-4626 + USCBase + harvestTrusted"],
          ["Agent API", "Off-chain", "Observe → decide → Attestcoin → harvest"],
          ["Web app", "Off-chain", "Wallet I/O, proofs, contracts, docs"],
        ],
      },
      {
        type: "h2",
        text: "Sequence",
      },
      {
        type: "ol",
        items: [
          "Desk posts CouponPaid on Sepolia (amount + metadata).",
          "Agent indexes logs; decideAllocation scores the desk.",
          "On accept: waitUntilHeightAttested(chainKey, height).",
          "getProof(txHash); PrecompileBlockProver.verifySingle on CC3.",
          "Harvester calls harvestTrusted (or execute with inclusion proof).",
          "_accrue mints pyUSD into the vault → sharePrice rises; shares unchanged.",
          "UI shows proof with Sepolia + CC3 explorer links.",
        ],
      },
      {
        type: "h2",
        text: "Repository layout",
      },
      {
        type: "code",
        text: "contracts/src/ProofYieldVault.sol   ERC-4626 + USC + harvest controls\ncontracts/src/USCBase.sol            verifyAndEmit → process once\npackages/agent/src/attestcoin.ts     @gluwa/usc-sdk ProofBuilder\npackages/agent/src/allocator.ts      risk / TVL-cap policy\napps/web/src/content/docs.ts         this whitepaper",
      },
    ],
  },
  {
    slug: "attestcoin",
    title: "Attestcoin",
    group: "Protocol",
    summary:
      "Every live harvest is preceded by Attestcoin height attestation and inclusion proof verification via @gluwa/usc-sdk.",
    body: [
      {
        type: "p",
        text: "Attestcoin Protocol (formerly USC) attests foreign-chain history and verifies inclusion proofs on Creditcoin via the Native Query Verifier precompile at 0x…0FD2.",
      },
      {
        type: "h2",
        text: "Off-chain prove path (live agent)",
      },
      {
        type: "code",
        text: "ProofBuilder(chainKey, ATTESTCOIN_PROVER_URL)\n  .waitUntilHeightAttested(chainKey, blockNumber)  // timeout 45s\n  .getProof(sepoliaTxHash)                         // timeout 30s\nPrecompileBlockProver(creditcoinRpc)\n  .verifySingle(chainKey, headerNumber, txBytes, merkleProof, continuityProof)",
      },
      {
        type: "p",
        text: "Implemented in packages/agent/src/attestcoin.ts. Failures leave the proof in attesting so the next poll retries — harvest never runs on an unverified coupon in live mode.",
      },
      {
        type: "h2",
        text: "On-chain USC path",
      },
      {
        type: "p",
        text: "USCBase.execute(...) computes queryId, rejects duplicates via processedQueries, calls VERIFIER.verifyAndEmit(...), then _processAndEmitEvent → _accrue. That is the preferred mainnet path. Testnet beta currently uses harvestTrusted after off-chain verify for operational reliability, with the same _accrue accounting.",
      },
      {
        type: "h2",
        text: "Configuration",
      },
      {
        type: "table",
        headers: ["Variable", "Purpose"],
        rows: [
          ["ATTESTCOIN_PROVER_URL", "https://prover.cc3-testnet.creditcoin.network"],
          ["CREDITCOIN_RPC_URL", "https://rpc.cc3-testnet.creditcoin.network"],
          ["SEPOLIA_CHAIN_KEY", "1 on CC3 testnet"],
          ["PROOFYIELD_MODE", "live disables mock proofs"],
        ],
      },
      {
        type: "callout",
        title: "Judging note",
        text: "Attestcoin is not optional decoration. Deposits never inflate APY; only proven coupons call _accrue.",
      },
    ],
  },
  {
    slug: "vault",
    title: "Vault & tokens",
    group: "Protocol",
    summary:
      "pyUSD underlying, pyvUSD shares. NAV = totalAssets / totalSupply (display). Conversions use OpenZeppelin virtual-offset math.",
    body: [
      {
        type: "h2",
        text: "Tokens",
      },
      {
        type: "table",
        headers: ["Symbol", "Role", "Decimals"],
        rows: [
          ["pyUSD", "ERC-20 asset (MockUSDC)", "6"],
          ["pyvUSD", "ERC-4626 vault share", "6 + offset (display 6; internal offset 3)"],
        ],
      },
      {
        type: "h2",
        text: "Share price display",
      },
      {
        type: "code",
        text: "sharePrice() =\n  supply == 0 ? 10^assetDecimals\n              : totalAssets() * 10^assetDecimals / totalSupply()",
      },
      {
        type: "p",
        text: "Harvest mints underlying into the vault without minting shares, so totalAssets rises while totalSupply is unchanged → sharePrice rises for all holders equally.",
      },
      {
        type: "h2",
        text: "User flows",
      },
      {
        type: "ul",
        items: [
          "Connect MetaMask → Creditcoin Testnet (CC3)",
          "Faucet mints test pyUSD",
          "approve + deposit / redeem",
          "Inspect Proofs + Contracts for explorer-backed state",
        ],
      },
    ],
  },
  {
    slug: "allocator",
    title: "Allocator math",
    group: "Protocol",
    summary:
      "Deterministic underwriter: risk score from desk riskBps, reject if coupon exceeds maxCouponBpsOfTvl or score < minRiskScore.",
    body: [
      {
        type: "h2",
        text: "Desk parameters",
      },
      {
        type: "table",
        headers: ["sourceId", "Desk", "tranche", "riskBps", "targetWeightBps"],
        rows: [
          ["1", "Trade Finance Invoice Pool", "senior", "200", "4000"],
          ["2", "T-Bill Proxy Desk", "treasury", "50", "4500"],
          ["3", "Emerging Market Receivables", "mezz", "450", "1500"],
        ],
      },
      {
        type: "h2",
        text: "Risk score",
      },
      {
        type: "code",
        text: "riskScore = clamp(0, 100, 100 - riskBps / 5)\n\n// examples\n// treasury riskBps=50  → score 90\n// senior   riskBps=200 → score 60\n// mezz     riskBps=450 → score 10",
      },
      {
        type: "h2",
        text: "Coupon vs TVL cap",
      },
      {
        type: "code",
        text: "couponBps = (couponAmount / tvl) * 10_000\nreject if couponBps > maxCouponBpsOfTvl   // default 500 (= 5%)\n\n// mirrors on-chain maxHarvestBps so policy and vault agree",
      },
      {
        type: "p",
        text: "Reject if riskScore < minRiskScore (default 40). Accept rationale is stored on the proof record for the Proofs UI.",
      },
      {
        type: "callout",
        title: "On-chain twin",
        text: "Even if the agent mis-scores, ProofYieldVault._accrue still enforces allowlistedSources and maxHarvestBps.",
      },
    ],
  },
  {
    slug: "erc4626-security",
    title: "ERC-4626 attacks",
    group: "Security",
    summary:
      "Mathematical treatment of inflation / donation attacks and ProofYield’s virtual-share offset defense (OpenZeppelin ERC-4626 + δ = 3).",
    body: [
      {
        type: "quote",
        text: "Exchange-rate safety is a prerequisite for any yield vault — Attestcoin does not fix a broken ERC-4626 mint formula.",
      },
      {
        type: "h2",
        text: "Exchange rate",
      },
      {
        type: "p",
        text: "Let A = totalAssets(), S = totalSupply(), δ = _decimalsOffset(). OpenZeppelin v5 conversions:",
      },
      {
        type: "code",
        text: "convertToShares(x) = x * (S + 10^δ) / (A + 1)\nconvertToAssets(y) = y * (A + 1) / (S + 10^δ)\n\nProofYield: δ = 3  ⇒  virtualShares = 1000, virtualAssets = 1",
      },
      {
        type: "h2",
        text: "Classic inflation / donation attack",
      },
      {
        type: "p",
        text: "Without virtual offsets (naive empty-vault mint shares = assets):",
      },
      {
        type: "ol",
        items: [
          "Attacker deposits 1 wei when S = 0 → receives 1 share.",
          "Attacker transfers D ≫ 1 assets directly to the vault (donation). Now A ≈ D, S = 1.",
          "Victim deposits X. shares = X * S / A = X / D. If X < D, integer division → 0 shares.",
          "Attacker redeems the only share and steals the victim’s deposit.",
        ],
      },
      {
        type: "code",
        text: "// Naive (unsafe) empty vault\nshares_victim = X * 1 / D     // → 0 when X < D\n\n// With virtual offset δ\nshares_victim = X * (0 + 10^δ) / (D + 1)\n             = X * 1000 / (D + 1)     // δ=3\n// Non-zero for any X >= 1 when D is finite",
      },
      {
        type: "h2",
        text: "Worked example (δ = 3)",
      },
      {
        type: "p",
        text: "Attacker deposits 1 unit, donates 100_000e6 pyUSD. Victim deposits 10_000e6:",
      },
      {
        type: "code",
        text: "S_virt = 1*1000 + 1000 = 2000   // approx after first deposit accounting\n// Exact OZ path after attacker deposit(1):\n//   shares_a = 1 * 10^3 / 1 = 1000\n// After donation A = 1 + 100_000e6\n// Victim deposit 10_000e6:\nshares_v = 10_000e6 * (1000 + 1000) / (100_000e6 + 1 + 1)\n         ≈ 10_000e6 * 2000 / 100_000e6\n         ≈ 200_000\n// >> 0  → attack fails to zero-out victim",
      },
      {
        type: "p",
        text: "Foundry coverage: testDonationAttackVictimStillGetsShares in contracts/test/ProofYieldVault.t.sol (asserts victimShares > 0 and redeemable assets > 9_000e6).",
      },
      {
        type: "h2",
        text: "What virtual shares do not fix",
      },
      {
        type: "ul",
        items: [
          "They do not prevent dilution from legitimate harvest mints (by design — all holders share yield).",
          "They do not replace Attestcoin — a malicious harvester could still mint fake yield without proofs.",
          "They do not replace harvest caps / allowlists / pause.",
        ],
      },
      {
        type: "h2",
        text: "Implementation",
      },
      {
        type: "code",
        text: "// ProofYieldVault.sol\nfunction _decimalsOffset() internal pure override returns (uint8) {\n    return 3;\n}",
      },
      {
        type: "callout",
        title: "Deploy note",
        text: "δ = 3 is in source and tests. If a prior testnet vault was deployed before this offset, redeploy to inherit the stronger virtual-share defense. Live addresses are listed under Contracts.",
      },
    ],
  },
  {
    slug: "security",
    title: "Trust & controls",
    group: "Security",
    summary:
      "Layered controls: ERC-4626 virtual shares, harvest caps, coupon replay keys, desk allowlists, pause, reentrancy guards, Attestcoin gating.",
    body: [
      {
        type: "h2",
        text: "Control matrix",
      },
      {
        type: "table",
        headers: ["Control", "Where", "Failure mode blocked"],
      rows: [
          ["_decimalsOffset = 3", "ProofYieldVault", "Empty-vault inflation / donation → 0 shares"],
          ["usedCoupons[tx‖id]", "harvestTrusted / _accrue", "Double harvest of same coupon"],
          ["processedQueries[queryId]", "USCBase.execute", "Replay of same Attestcoin query"],
          ["allowlistedSources", "_accrue", "Unknown desk IDs"],
          ["maxHarvestBps (≤ 5% default)", "_accrue", "Single harvest draining / spiking NAV"],
          ["whenNotPaused", "ERC-4626 + harvest", "Ops freeze under incident"],
          ["nonReentrant", "deposit/mint/withdraw/redeem/harvest", "ERC-777 style reentrancy"],
          ["harvester/owner only", "harvestTrusted", "Public fake accrual"],
          ["Attestcoin verify (live)", "agent attestcoin.ts", "Unproven Sepolia cashflow"],
          ["Allocator TVL + risk caps", "allocator.ts", "Oversized / junk coupons pre-harvest"],
        ],
      },
      {
        type: "h2",
        text: "Remaining trust (testnet)",
      },
      {
        type: "ul",
        items: [
          "Harvester key can call harvestTrusted after off-chain verify (migrate to execute-only).",
          "RwaYieldSource owner posts coupons (simulates desks).",
          "Faucet minter for test pyUSD.",
          "Agent / Railway operator availability.",
        ],
      },
      {
        type: "h2",
        text: "User verification checklist",
      },
      {
        type: "ol",
        items: [
          "App badge reads Live.",
          "Contracts tab addresses match deployments/testnet.json.",
          "Harvested proof links open real Sepolia + CC3 txs.",
          "Never paste keys; never film .env.",
        ],
      },
    ],
  },
  {
    slug: "implementation",
    title: "Implementation",
    group: "Security",
    summary:
      "Hackathon implementation map: Solidity entrypoints, agent prove/harvest loop, and how the UI surfaces proofs.",
    body: [
      {
        type: "h2",
        text: "Solidity — accrual",
      },
      {
        type: "code",
        text: "function _accrue(queryId, sourceId, couponId, amount) internal {\n  require(allowlistedSources[sourceId]);\n  if (totalAssets() > 0) {\n    cap = totalAssets() * maxHarvestBps / 10_000;\n    require(amount <= cap);          // HarvestCapExceeded\n  }\n  MockUSDC(asset()).mint(address(this), amount);  // A↑, S unchanged\n  totalHarvested += amount;\n  emit YieldHarvested(... sharePrice());\n}",
      },
      {
        type: "h2",
        text: "Solidity — replay key",
      },
      {
        type: "code",
        text: "couponKey = keccak256(abi.encodePacked(sepoliaTxHash, couponId));\nif (usedCoupons[couponKey]) revert CouponAlreadyUsed();\nusedCoupons[couponKey] = true;",
      },
      {
        type: "h2",
        text: "Agent — live tick",
      },
      {
        type: "ol",
        items: [
          "pollLiveCoupons: fetch CouponPaid logs from Sepolia source",
          "processCoupon: decideAllocation → proveSepoliaTx → harvestTrusted",
          "retryOpenProofs: re-drive attesting/attested rows (Attestcoin lag)",
          "refreshLiveVault: sync TVL / sharePrice from chain",
          "repairProofRecords: normalize metadata + restore known harvest hashes",
        ],
      },
      {
        type: "h2",
        text: "Why harvestTrusted on testnet",
      },
      {
        type: "p",
        text: "USCBase.execute is implemented and preferred for mainnet. Beta testnet uses harvestTrusted after PrecompileBlockProver.verifySingle so operator tooling can recover from Attestcoin prover latency without stranding coupons. Accounting (_accrue) is identical.",
      },
      {
        type: "h2",
        text: "Tests shipped",
      },
      {
        type: "ul",
        items: [
          "testDepositAndHarvestRaisesSharePrice",
          "testDonationAttackVictimStillGetsShares",
          "testHarvestCap",
          "testRejectUnknownSource",
          "testRwaSourceEmitsCoupon",
        ],
      },
      {
        type: "h2",
        text: "UI honesty",
      },
      {
        type: "ul",
        items: [
          "Live mode never falls back to template proofs",
          "Explorer links require 0x + 64 hex (no already-harvested placeholders)",
          "Coupon labels map to desk names, not internal CLI tags",
        ],
      },
    ],
  },
  {
    slug: "contracts",
    title: "Contracts",
    group: "Reference",
    summary: "Canonical live testnet addresses with explorer links.",
    body: [
      {
        type: "table",
        headers: ["Contract", "Network", "Address", "Explorer"],
        rows: [
          [
            "RWA Yield Source",
            "Sepolia",
            "0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB",
            "https://sepolia.etherscan.io/address/0x9c431d95619aBd5A680F8D6DE4A2BDD4c070bCcB",
          ],
          [
            "ProofYield Vault",
            "CC3",
            "0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc",
            "https://creditcoin-testnet.blockscout.com/address/0x9C1bF7e744bC11aa2864BCB1701402eAdd7Fccbc",
          ],
          [
            "pyUSD (MockUSDC)",
            "CC3",
            "0x3a9d9B7467D95abf4EAFb1721838eF999662c1F9",
            "https://creditcoin-testnet.blockscout.com/address/0x3a9d9B7467D95abf4EAFb1721838eF999662c1F9",
          ],
        ],
      },
      {
        type: "h2",
        text: "Example proof transactions",
      },
      {
        type: "ul",
        items: [
          "CouponPaid $500 — https://sepolia.etherscan.io/tx/0x5a8b6d6ee97ea486735f7a0ce840d213ba7bf3cd43a10c8cac16b2d0568eaeac",
          "CouponPaid $100 — https://sepolia.etherscan.io/tx/0x88447ed2ed22d0f1db5b57b74b01d317c7e64af7bdf121dc508a0770c2235232",
          "harvestTrusted $500 — https://creditcoin-testnet.blockscout.com/tx/0x803c4cdb9eebbd4c0bde1b9ff38a6530a56ea7ac70d2091df6e00002e6564ade",
          "harvestTrusted $100 — https://creditcoin-testnet.blockscout.com/tx/0x901ac5d3e8c015b8a409ee8f42d6efbbfa1085ac2d4859ab32e5717abd0dd30d",
        ],
      },
      {
        type: "p",
        text: "Source of truth: deployments/testnet.json · docs/proofs/testnet-txs.md",
      },
    ],
  },
  {
    slug: "roadmap",
    title: "Roadmap",
    group: "Reference",
    summary: "From BUIDL CTC testnet vault to CEIP-ready deposit infrastructure.",
    body: [
      {
        type: "h2",
        text: "Now",
      },
      {
        type: "ul",
        items: [
          "Live Sepolia + CC3 deployments",
          "Attestcoin-gated harvest loop",
          "ERC-4626 virtual-share offset + Foundry donation test",
          "Wallet deposit / redeem + faucet",
          "Public proofs, contracts UI, whitepaper docs",
        ],
      },
      {
        type: "h2",
        text: "Next",
      },
      {
        type: "ul",
        items: [
          "Default harvest path = USCBase.execute only (remove harvestTrusted privilege)",
          "Formalize desk onboarding + tranche labeling",
          "Composable pyvUSD as CTC lending / DEX collateral",
          "Mainnet RWA partners and CEIP fast-track",
        ],
      },
    ],
  },
];

export function getDoc(slug: string): DocSection | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export function getDocIndex(slug: string): number {
  return DOCS.findIndex((d) => d.slug === slug);
}

export const DEFAULT_DOC_SLUG = "overview";
