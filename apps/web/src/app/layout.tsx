import type { Metadata } from "next";
import { Outfit, Instrument_Sans, IBM_Plex_Mono, Bebas_Neue } from "next/font/google";
import { Providers } from "../components/providers";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["200", "300", "400", "500", "600", "700"],
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-logo",
  weight: "400",
});

export const metadata: Metadata = {
  title: "ProofYield — Attestcoin RWA yield on Creditcoin",
  description:
    "Deposit once. Earn real RWA coupons proven via Attestcoin. AI-allocated yield on Creditcoin.",
  icons: {
    icon: [
      { url: "/brand/proofyield-mark.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "ProofYield — Attestcoin RWA yield on Creditcoin",
    description:
      "Deposit once. Earn real RWA coupons proven via Attestcoin. AI-allocated yield on Creditcoin.",
    images: [{ url: "/brand/tokens-pair.png", alt: "ProofYield" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/tokens-pair.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${instrument.variable} ${mono.variable} ${bebas.variable}`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
