import type { Metadata } from "next";
import { Barlow, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShipNative — Describe it. Ship it.",
  description:
    "Describe your mobile app in natural language. An AI agent builds it in real-time.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${instrumentSerif.variable} ${barlow.variable} ${jetbrainsMono.variable}`}>
        <body style={{ fontFamily: 'var(--font-body)' }}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
