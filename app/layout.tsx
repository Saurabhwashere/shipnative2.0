import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const instrumentSerif = localFont({
  src: [
    { path: "./fonts/instrument-serif-regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-heading",
  display: "swap",
});

const barlow = localFont({
  src: [
    { path: "./fonts/barlow-300.ttf", weight: "300", style: "normal" },
    { path: "./fonts/barlow-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/barlow-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/barlow-600.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/jetbrains-mono-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/jetbrains-mono-700.ttf", weight: "700", style: "normal" },
    { path: "./fonts/jetbrains-mono-800.ttf", weight: "800", style: "normal" },
  ],
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
