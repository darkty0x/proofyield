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
    ],
  },
  {
    group: "Reference",
    items: [
      { slug: "contracts", title: "Contracts" },
      { slug: "security", title: "Security model" },
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
        text: "Who it is for",
      },
      {
        type: "ul",
        items: [
          "Depositors who want RWA-style yield without trusting a centralized oracle feed",
          "Builders composing CTC DeFi who need a verifiable yield share (pyvUSD)",
          "Judges and partners evaluating Attestcoin depth on Creditcoin testnet",
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
          ["API", "https://proofyield-api-production.up.railway.app"],
          ["GitHub", "https://github.com/darkty0x/proofyield"],
          ["Deployments API", "https://proofyield-api-production.up.railway.app/api/deployments"],
        ],
      },
      {
        type: "h2",
        text: "Core loop",
      },
      {
        type: "code",
        text: "observe (Sepolia CouponPaid)\n  → decide (allocator policy / AI rationale)\n  → Attestcoin prove (@gluwa/usc-sdk)\n  → harvest (ProofYieldVault)\n  → audit (proofs ledger)",
      },
      {
        type: "callout",
        title: "Non-negotiable",
        text: "In live mode, deposits alone never inflate APY. Every accrual requires a proven coupon path through Attestcoin.",
      },
    ],
  },
  {
    slug: "problem",
    title: "Problem",
    group: "Whitepaper",
    summary:
      "Creditcoin needs sticky TVL. Today’s RWA yield products either invent APY off-chain or depend on trusted oracles that can lie.",
    body: [
      {
        type: "p",
        text: "Creditcoin’s thesis is real-world credit and cross-chain verification. For DeFi on CTC to retain deposits, yield must be credible — not emission farming dressed as RWA.",
      },
      {
        type: "h2",
        text: "Failure modes of “RWA yield” today",
      },
      {
        type: "ol",
        items: [
          "Oracle-reported coupons — a single operator can publish false cashflows.",
          "Bridged IOUs — bridging risk and custodian risk dominate the product.",
          "Emission APY — TVL is rented, not earned from underlying receivables.",
        ],
      },
      {
        type: "h2",
        text: "What depositors actually need",
      },
      {
        type: "p",
        text: "A share token whose NAV increases only when an external cashflow event is proven on Creditcoin. That proof must be inspectable on a block explorer, not asserted in a dashboard.",
      },
      {
        type: "callout",
        title: "Insight",
        text: "Attestcoin exists so foreign-chain history can become a verifiable fact on CC3. ProofYield turns that primitive into a deposit product.",
      },
    ],
  },
  {
    slug: "solution",
    title: "Solution",
    group: "Whitepaper",
    summary:
      "One-click ERC-4626 vault. AI-ranked RWA desks. Attestcoin-gated harvest. Composable pyvUSD shares on Creditcoin.",
    body: [
      {
        type: "p",
        text: "ProofYield packages Attestcoin into a familiar vault UX: connect wallet, get test pyUSD, deposit, and watch proofs and NAV update in the app.",
      },
      {
        type: "h2",
        text: "Product properties",
      },
      {
        type: "ul",
        items: [
          "ERC-4626 vault on Creditcoin CC3 (pyvUSD shares / pyUSD asset)",
          "Sepolia RwaYieldSource emits CouponPaid for RWA desks",
          "Agent allocates across desks with risk scores and TVL caps",
          "Attestcoin proves Sepolia inclusion before harvestTrusted",
          "Proofs ledger + Contracts tab link every address and tx to explorers",
        ],
      },
      {
        type: "h2",
        text: "Why this unlocks CTC DeFi",
      },
      {
        type: "p",
        text: "Once pyvUSD NAV is proof-backed, lending markets, DEXes, and structured products on Creditcoin can treat it as collateral with a transparent accrual story — the flywheel described in the CEIP deck.",
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
          ["MockUSDC (pyUSD)", "CC3", "Deposit asset / faucet mint"],
          ["ProofYieldVault", "CC3", "ERC-4626 + harvestTrusted"],
          ["Agent API", "Off-chain", "Observe → decide → Attestcoin → harvest"],
          ["Web app", "Off-chain", "Wallet I/O, proofs, contracts UI"],
        ],
      },
      {
        type: "h2",
        text: "Sequence",
      },
      {
        type: "ol",
        items: [
          "Desk posts a coupon on Sepolia (amount + metadata).",
          "Agent indexes CouponPaid logs and scores the desk.",
          "On accept, agent waits until the Sepolia height is attested on CC3.",
          "Agent builds an inclusion proof via @gluwa/usc-sdk.",
          "Harvester calls harvestTrusted; vault accrues assets; sharePrice rises.",
          "UI shows the proof with Sepolia + CC3 explorer links.",
        ],
      },
      {
        type: "h2",
        text: "Repository layout",
      },
      {
        type: "code",
        text: "contracts/     Foundry — RwaYieldSource, MockUSDC, ProofYieldVault\npackages/agent Node — watcher, allocator, Attestcoin, HTTP API\napps/web       Next.js — landing, vault app, docs\ndeployments/   Canonical testnet addresses\ndocs/          Integration notes, proofs, submission",
      },
    ],
  },
  {
    slug: "attestcoin",
    title: "Attestcoin",
    group: "Protocol",
    summary:
      "ProofYield gates all yield accrual on Attestcoin-proven Sepolia coupons — the mandatory Creditcoin primitive for this track.",
    body: [
      {
        type: "p",
        text: "Attestcoin Protocol (formerly USC) attests foreign-chain history and verifies inclusion proofs on Creditcoin via the Native Query Verifier precompile. ProofYield uses this so a Sepolia CouponPaid cannot move vault NAV until CC3 accepts the proof path.",
      },
      {
        type: "h2",
        text: "Integration steps",
      },
      {
        type: "ol",
        items: [
          "Observe CouponPaid on Sepolia RwaYieldSource.",
          "Run allocation policy (accept / reject).",
          "ProofBuilder.waitUntilHeightAttested(chainKey, blockNumber).",
          "ProofBuilder.getProof(txHash); optional on-chain verify.",
          "harvestTrusted on ProofYieldVault after verification.",
        ],
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
        type: "h2",
        text: "References",
      },
      {
        type: "ul",
        items: [
          "https://docs.creditcoin.org/creditcoin-usc",
          "https://docs.creditcoin.org/creditcoin-usc/dapp-builder-infrastructure/usc-sdk",
          "https://docs.creditcoin.org/creditcoin-usc/usc-chains-environments",
        ],
      },
      {
        type: "callout",
        title: "Judging note",
        text: "Depth of Attestcoin utilization is a core criterion. ProofYield does not treat Attestcoin as optional decoration — it is the gate on every harvest.",
      },
    ],
  },
  {
    slug: "vault",
    title: "Vault & tokens",
    group: "Protocol",
    summary: "pyUSD is the underlying asset. pyvUSD is the ERC-4626 vault share. NAV = totalAssets / totalSupply.",
    body: [
      {
        type: "h2",
        text: "Tokens",
      },
      {
        type: "table",
        headers: ["Symbol", "Role", "Network"],
        rows: [
          ["pyUSD", "Deposit / redeem asset (MockUSDC, 6 decimals)", "Creditcoin CC3"],
          ["pyvUSD", "Vault shares (ERC-4626)", "Creditcoin CC3"],
        ],
      },
      {
        type: "h2",
        text: "User flows",
      },
      {
        type: "ul",
        items: [
          "Connect MetaMask → switch to Creditcoin Testnet (CC3)",
          "Get test pyUSD from the in-app faucet",
          "Approve + deposit into ProofYieldVault",
          "Redeem shares to withdraw pyUSD",
          "Inspect Proofs and Contracts for explorer-backed state",
        ],
      },
      {
        type: "h2",
        text: "How NAV moves",
      },
      {
        type: "p",
        text: "Harvests mint additional underlying into the vault after a proven coupon. Share price increases for all holders. Deposits mint shares at the current share price without fabricating yield.",
      },
      {
        type: "code",
        text: "sharePrice ≈ totalAssets / totalSupply\n// rises only after harvestTrusted succeeds for a proven coupon",
      },
    ],
  },
  {
    slug: "contracts",
    title: "Contracts",
    group: "Reference",
    summary: "Canonical live testnet addresses with explorer links. Also available in-app under Contracts.",
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
        text: "Source of truth in-repo: deployments/testnet.json and docs/proofs/testnet-txs.md.",
      },
    ],
  },
  {
    slug: "security",
    title: "Security model",
    group: "Reference",
    summary:
      "Trust boundaries for testnet: what Attestcoin removes, what remains operator-controlled, and what users should verify.",
    body: [
      {
        type: "h2",
        text: "What Attestcoin removes",
      },
      {
        type: "ul",
        items: [
          "Belief that a dashboard APY equals on-chain accrual",
          "Need for a centralized price oracle to invent coupon income",
        ],
      },
      {
        type: "h2",
        text: "What remains trusted on testnet",
      },
      {
        type: "ul",
        items: [
          "Harvester key that may call harvestTrusted after off-chain verify",
          "RwaYieldSource owner who posts coupons (simulates RWA desks)",
          "Faucet minter for test pyUSD",
          "Agent host / Railway deployment operator",
        ],
      },
      {
        type: "h2",
        text: "User checklist",
      },
      {
        type: "ol",
        items: [
          "Confirm the app badge reads Live.",
          "Open Contracts and verify addresses match deployments/testnet.json.",
          "Open a harvested proof and click Sepolia + CC3 explorer links.",
          "Never paste private keys; never film .env.",
        ],
      },
      {
        type: "callout",
        title: "Mainnet path",
        text: "Production hardening moves toward on-path USC execute verification, desk allowlists, and reduced harvester privilege — see Roadmap.",
      },
    ],
  },
  {
    slug: "roadmap",
    title: "Roadmap",
    group: "Reference",
    summary: "From BUIDL CTC testnet vault to CEIP-ready deposit infrastructure for Creditcoin DeFi.",
    body: [
      {
        type: "h2",
        text: "Now — BUIDL CTC testnet",
      },
      {
        type: "ul",
        items: [
          "Live Sepolia + CC3 deployments",
          "Attestcoin-gated harvest loop",
          "Wallet deposit / redeem + faucet",
          "Public proofs and contracts UI",
        ],
      },
      {
        type: "h2",
        text: "Next",
      },
      {
        type: "ul",
        items: [
          "Deeper on-path USC execute verification in the vault",
          "Institutional desk onboarding + tranche labeling",
          "Composable pyvUSD as CTC lending / DEX collateral",
          "Mainnet RWA partners and CEIP fast-track",
        ],
      },
      {
        type: "h2",
        text: "Ask",
      },
      {
        type: "p",
        text: "CEIP fast-track: capital, engineering advisory, and distribution through the Creditcoin community so ProofYield can become the default verified RWA deposit layer on CTC.",
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
