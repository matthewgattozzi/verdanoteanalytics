import { NavLink } from "@/components/NavLink";
import {
  Settings,
  LayoutGrid,
  BarChart3,
  FileText,
  Zap,
  LogOut,
  UserCog,
  Bookmark,
  Tags,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountContext } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const baseNavItems = [
  { title: "Creatives", url: "/", icon: LayoutGrid },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Tagging", url: "/tagging", icon: Tags },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Saved Views", url: "/saved-views", icon: Bookmark },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { accounts, selectedAccountId, setSelectedAccountId, isLoading } = useAccountContext();
  const { role, isClient, user, signOut } = useAuth();

  // Clients with 1 account don't need switcher
  const showSwitcher = !isClient || accounts.length > 1;
  // Only builder and employee see settings
  const showSettings = !isClient;
  const navItems = baseNavItems;

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border/60 bg-gradient-to-b from-sidebar to-sidebar-accent">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/40">
        <img src="/favicon.png" alt="Logo" className="h-8 w-8 rounded-lg shadow-sm" />
        <div className="font-serif">
          <span className="text-sm font-semibold text-foreground tracking-tight">Verdanote</span>
        </div>
      </div>

      {/* Role badge + Account Switcher */}
      <div className="px-3 pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Account</p>
          <Badge variant="outline" className="text-[9px] capitalize h-4 px-1.5">{role}</Badge>
        </div>
        {showSwitcher && accounts.length > 0 && (
          <Select value={selectedAccountId || ""} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-full h-9 text-xs bg-background/60 border-border/50">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {!isClient && <SelectItem value="all" className="text-xs">All Accounts</SelectItem>}
              {[...accounts].sort((a: any, b: any) => a.name.localeCompare(b.name)).map((acc: any) => (
                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isClient && accounts.length === 1 && (
          <p className="text-xs font-medium px-2 truncate">{accounts[0].name}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:bg-sidebar-accent hover:text-foreground"
            activeClassName="bg-sidebar-accent text-foreground shadow-sm border border-border/30"
            onClick={onNavigate}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.title}
          </NavLink>
        ))}
        {showSettings && (
          <NavLink
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:bg-sidebar-accent hover:text-foreground"
            activeClassName="bg-sidebar-accent text-foreground shadow-sm border border-border/30"
            onClick={onNavigate}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            Settings
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="mx-5 border-t border-border/30" />
      <div className="px-3 pt-3 pb-1">
        <NavLink
          to="/user-settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:bg-sidebar-accent hover:text-foreground"
          activeClassName="bg-sidebar-accent text-foreground shadow-sm border border-border/30"
          onClick={onNavigate}
        >
          <UserCog className="h-4 w-4 flex-shrink-0" />
          User Settings
        </NavLink>
      </div>
      <div className="px-5 pb-4 pt-1 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground/70 truncate">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={signOut} title="Sign out">
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}
