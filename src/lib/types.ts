// Types for VARYNTH modules/apps
export interface VarynthModule {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name or emoji
  color: "violet" | "cyan" | "green" | "orange" | "red";
  href: string;
  status: "active" | "wip" | "coming-soon";
  tags: string[];
  version?: string;
}

// Auth types
export interface VarynthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "owner" | "member";
}

