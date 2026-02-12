import { NavLink } from "@/components/NavLink";
import {
  Settings,
  LayoutGrid,
  BarChart3,
  FileText,
  Zap,
  History,
} from "lucide-react";

const navItems = [
  { title: "Creatives", url: "/", icon: LayoutGrid },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Sync History", url: "/sync-history", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border/60 bg-gradient-to-b from-[hsl(34,28%,95%)] to-[hsl(30,22%,92%)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="font-serif">
          <span className="text-sm font-semibold text-foreground tracking-tight">Creative</span>
          <span className="text-sm font-semibold text-primary tracking-tight"> Analytics</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:bg-[hsl(30,20%,88%)] hover:text-foreground"
            activeClassName="bg-[hsl(30,22%,87%)] text-foreground shadow-[inset_0_1px_2px_hsl(30_20%_70%/0.15)] border border-border/30"
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      {/* Decorative divider */}
      <div className="mx-5 border-t border-border/30" />

      {/* Footer */}
      <div className="px-5 py-4">
        <p className="text-[10px] text-muted-foreground/70 font-mono tracking-wide">Meta Ads Creative Analytics</p>
      </div>
    </aside>
  );
}
