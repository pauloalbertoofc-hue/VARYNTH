import type { Metadata } from "next";
import { AppDownloadPage } from "@/components/public/AppDownloadPage";
import { VARYNTH_PUBLIC_ORIGIN } from "@/lib/config/platform";

export const metadata: Metadata = {
  title: "VARYNTH para celular e computador",
  description: "Acesse e instale o Web App VARYNTH no celular ou computador.",
  alternates: { canonical: `${VARYNTH_PUBLIC_ORIGIN}/download` },
};

export default function DownloadPage() {
  return <AppDownloadPage />;
}
