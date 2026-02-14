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

  const showSwitcher = !isClient || accounts.length > 1;
  const showSettings = !isClient;
  const navItems = baseNavItems;

  return (
    <aside
      className="flex h-screen w-56 flex-col"
      style={{
        background: 'linear-gradient(180deg, hsl(82 16% 86%) 0%, hsl(80 14% 82%) 100%)',
        boxShadow: '4px 0 12px hsl(82 12% 70% / 0.3), -2px 0 6px hsl(80 14% 96% / 0.4)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{
        borderBottom: '1px solid hsl(82 10% 78% / 0.5)',
      }}>
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden"
          style={{
            boxShadow: '3px 3px 6px hsl(82 12% 72%), -2px -2px 4px hsl(80 14% 94%)',
          }}
        >
          <img src="/favicon.png" alt="Logo" className="h-9 w-9" />
        </div>
        <div className="font-serif">
          <span className="text-sm font-semibold text-foreground tracking-tight">Verdanote</span>
        </div>
      </div>

      {/* Role badge + Account Switcher */}
      <div className="px-3 pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Account</p>
          <Badge variant="outline" className="text-[9px] capitalize h-4 px-1.5 border-border/50">{role}</Badge>
        </div>
        {showSwitcher && accounts.length > 0 && (
          <Select value={selectedAccountId || ""} onValueChange={setSelectedAccountId}>
            <SelectTrigger
              className="w-full h-9 text-xs border-0"
              style={{
                background: 'hsl(80 12% 88%)',
                boxShadow: 'inset 2px 2px 4px hsl(82 12% 74%), inset -1px -1px 3px hsl(80 14% 95%)',
                borderRadius: '0.5rem',
              }}
            >
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
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="sidebar-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:text-foreground"
            activeClassName="sidebar-nav-active"
            onClick={onNavigate}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.title}
          </NavLink>
        ))}
        {showSettings && (
          <NavLink
            to="/settings"
            className="sidebar-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:text-foreground"
            activeClassName="sidebar-nav-active"
            onClick={onNavigate}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            Settings
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="mx-5" style={{ borderTop: '1px solid hsl(82 10% 78% / 0.4)' }} />
      <div className="px-3 pt-3 pb-1">
        <NavLink
          to="/user-settings"
          className="sidebar-nav-item flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:text-foreground"
          activeClassName="sidebar-nav-active"
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
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
          style={{
            boxShadow: '2px 2px 4px hsl(82 12% 72%), -1px -1px 3px hsl(80 14% 94%)',
          }}
          onClick={signOut}
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}
