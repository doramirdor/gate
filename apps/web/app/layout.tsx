import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { BRAND_NAME, DOMAIN, SITE_URL, TAGLINE } from "@shared/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} · ${TAGLINE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    "Save your preferences once. Your AI assistants use them and ask for your approval before they spend, send, or do anything you can't undo.",
  applicationName: BRAND_NAME,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? `https://${DOMAIN}`),
  keywords: [
    "AI assistant permissions",
    "AI agent approvals",
    "human in the loop AI",
    "AI agent guardrails",
    "MCP",
    "Model Context Protocol",
    "AI preferences",
    "agent context",
    "approve AI actions",
    "Claude",
    "ChatGPT agents",
  ],
  authors: [{ name: BRAND_NAME }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    url: SITE_URL,
    title: `${BRAND_NAME} · ${TAGLINE}`,
    description:
      "One link that holds your preferences and approvals for AI assistants. They read the context you allow and ask before they spend, send, or act.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} · ${TAGLINE}`,
    description:
      "One link that holds your preferences and approvals for AI assistants. They ask before they spend, send, or act.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
