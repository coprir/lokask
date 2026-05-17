import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AiDisclosureBanner } from "@/components/ai-disclosure-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MAYA AI — Your AI Virtual Influencer",
  description:
    "Connect with Maya, an AI-generated virtual influencer. 100% transparent — Maya is powered by artificial intelligence.",
  keywords: ["AI influencer", "virtual influencer", "AI companion", "MAYA AI"],
  openGraph: {
    title: "MAYA AI",
    description: "Connect with the future. Maya is AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-cyber-darker min-h-screen`}>
        <Providers>
          <AiDisclosureBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
