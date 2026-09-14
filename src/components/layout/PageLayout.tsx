import { CustomizationProvider } from "@/components/customization/CustomizationProvider";
import { CustomizedPageFrame } from "@/components/customization/CustomizedPageFrame";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PageLayout({ children, title, subtitle, className }: PageLayoutProps) {
  return (
    <CustomizationProvider><CustomizedPageFrame title={title} subtitle={subtitle} className={className}>{children}</CustomizedPageFrame></CustomizationProvider>
  );
}
