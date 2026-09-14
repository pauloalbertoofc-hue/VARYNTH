import type { Metadata, Viewport } from "next";
import "./globals.css";
import { VARYNTH_PUBLIC_ORIGIN, VARYNTH_PUBLIC_URL } from "@/lib/config/platform";

export const metadata: Metadata = {
  metadataBase: new URL(VARYNTH_PUBLIC_ORIGIN),
  title: "VARYNTH",
  description: "Seu OS pessoal soberano na web — hub de apps e projetos",
  alternates: { canonical: VARYNTH_PUBLIC_URL },
  openGraph: { title: "VARYNTH", description: "Seu OS pessoal soberano na web — hub de apps e projetos", url: VARYNTH_PUBLIC_URL, type: "website" },
  icons: { icon: "/api/app-icon", apple: "/api/app-icon" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VARYNTH",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased safe-top safe-bottom safe-left safe-right">
        {children}
      </body>
    </html>
  );
}
