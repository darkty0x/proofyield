/** Public social / community links for ProofYield. */
export const SOCIAL_LINKS = [
  {
    id: "x",
    label: "X",
    href: process.env.NEXT_PUBLIC_SOCIAL_X ?? "https://x.com/proofyield",
  },
  {
    id: "github",
    label: "GitHub",
    href: process.env.NEXT_PUBLIC_SOCIAL_GITHUB ?? "https://github.com/darkty0x/proofyield",
  },
  {
    id: "discord",
    label: "Discord",
    href: process.env.NEXT_PUBLIC_SOCIAL_DISCORD ?? "https://discord.gg/creditcoin",
  },
  {
    id: "telegram",
    label: "Telegram",
    href: process.env.NEXT_PUBLIC_SOCIAL_TELEGRAM ?? "https://t.me/proofyield",
  },
] as const;

export type SocialId = (typeof SOCIAL_LINKS)[number]["id"];
