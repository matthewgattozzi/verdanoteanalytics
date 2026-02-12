import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { useAccountContext } from "@/contexts/AccountContext";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  showAccount?: boolean;
}

export function PageHeader({ title, description, badge, actions, className, showAccount = true }: PageHeaderProps) {
  const { selectedAccount, selectedAccountId } = useAccountContext();
  const showAccountBadge = showAccount && selectedAccount && selectedAccountId !== "all";

  return (
    <div className={cn("flex items-start justify-between mb-6", className)}>
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {showAccountBadge && (
            <Badge variant="secondary" className="text-xs font-medium">
              {selectedAccount.name}
            </Badge>
          )}
          {badge}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
