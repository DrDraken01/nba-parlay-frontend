import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Optimized font loading - only weights actually used in the app
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",        // Prevents FOIT, shows fallback immediately
  preload: true,          // Prioritizes font loading
  weight: ["400", "700", "900"], // Only Regular, Bold, Black (used in design)
  fallback: ["system-ui", "arial"], // Fast fallback fonts
});

// Separate viewport export (Next.js 14 best practice)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,        // Allow zoom for accessibility
  themeColor: "#000000",
};

// Optimized metadata
export const metadata: Metadata = {
  title: {
    default: "NBA Parlay Analyzer",
    template: "%s | NBA Parlay Analyzer", // For future pages
  },
  description: "Statistical analysis for NBA player prop parlays using real game data. Make informed betting decisions with accurate probability calculations.",
  keywords: ["NBA", "parlay", "betting", "analytics", "statistics", "basketball", "sports betting"],
  authors: [{ name: "NBA Parlay Analyzer" }],
  creator: "NBA Parlay Analyzer",
  publisher: "NBA Parlay Analyzer",
  
  // SEO optimizations
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
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
  
  // Open Graph for social sharing
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nba-parlay-frontend.vercel.app",
    siteName: "NBA Parlay Analyzer",
    title: "NBA Parlay Analyzer - Real Stats, Real Probabilities",
    description: "Statistical analysis for NBA player prop parlays using real game data.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NBA Parlay Analyzer",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "NBA Parlay Analyzer",
    description: "Statistical analysis for NBA player prop parlays",
    images: ["/og-image.png"],
  },
  
  // Manifest for PWA
  manifest: "/manifest.json",
  
  // Additional metadata
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
