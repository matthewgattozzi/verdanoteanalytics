import { NavLink } from "@/components/NavLink";
import {
  Settings,
  Building2,
  LayoutGrid,
  BarChart3,
  FileText,
  Zap,
  History,
} from "lucide-react";

const navItems = [
  { title: "Creatives", url: "/", icon: LayoutGrid },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Sync History", url: "/sync-history", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground">Creative</span>
          <span className="text-sm font-semibold text-primary"> Analytics</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeClassName="bg-sidebar-accent text-primary"
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-[10px] text-muted-foreground font-mono">Meta Ads Creative Analytics</p>
      </div>
    </aside>
  );
}
