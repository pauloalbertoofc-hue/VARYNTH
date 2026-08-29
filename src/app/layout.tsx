import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VARYNTH",
  description: "Your personal OS on the web",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

