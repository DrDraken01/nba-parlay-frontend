import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  weight: ["400", "700", "900"],
  fallback: ["system-ui", "arial"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://nba-parlay-frontend.vercel.app'),
  title: {
    default: "NBA Parlay Analyzer",
    template: "%s | NBA Parlay Analyzer",
  },
  description: "Statistical analysis for NBA player prop parlays using real game data. Make informed betting decisions with accurate probability calculations.",
  keywords: ["NBA", "parlay", "betting", "analytics", "statistics", "basketball", "sports betting"],
  authors: [{ name: "NBA Parlay Analyzer" }],
  creator: "NBA Parlay Analyzer",
  publisher: "NBA Parlay Analyzer",
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  icons: {
    icon: "/favicon.ico",
  },
  
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nba-parlay-frontend.vercel.app",
    siteName: "NBA Parlay Analyzer",
    title: "NBA Parlay Analyzer - Real Stats, Real Probabilities",
    description: "Statistical analysis for NBA player prop parlays using real game data.",
  },
  
  twitter: {
    card: "summary_large_image",
    title: "NBA Parlay Analyzer",
    description: "Statistical analysis for NBA player prop parlays",
  },
  
  category: "sports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-black text-white">
        {children}
      </body>
    </html>
  );
}
