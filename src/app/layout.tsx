import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GameTracker } from "@/components/GameTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "fun.crafted - AI-Powered Games",
  description: "A collection of playful AI experiments. Play Who Am I?, AI Logline Creator, and AI or Not!",
  keywords: ["AI games", "Gemini", "fun", "interactive", "guessing game"],
  authors: [{ name: "Crafted Anomaly", url: "https://craftedanomaly.com" }],
  openGraph: {
    title: "fun.crafted - AI-Powered Games",
    description: "A collection of playful AI experiments",
    url: "https://fun.craftedanomaly.com",
    siteName: "fun.crafted",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <GameTracker />
      </body>
    </html>
  );
}
