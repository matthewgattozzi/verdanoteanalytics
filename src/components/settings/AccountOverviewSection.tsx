import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Clock, Upload, Pencil } from "lucide-react";

interface AccountOverviewSectionProps {
  account: any;
  onRename: () => void;
  onSync: () => void;
  syncPending: boolean;
  onUploadCsv: () => void;
  onToggle: (checked: boolean) => void;
}

export function AccountOverviewSection({
  account, onRename, onSync, syncPending, onUploadCsv, onToggle,
}: AccountOverviewSectionProps) {
  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <section className="glass-panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Account Overview</h2>
          <p className="text-[11px] font-mono text-muted-foreground">{account.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onRename} title="Rename">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={onSync} disabled={syncPending}>
            {syncPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Sync
          </Button>
          <Button size="sm" variant="outline" onClick={onUploadCsv}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Active</TableHead>
              <TableHead>Creatives</TableHead>
              <TableHead>Untagged</TableHead>
              <TableHead>Last Synced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <Switch checked={account.is_active} onCheckedChange={onToggle} />
              </TableCell>
              <TableCell className="text-sm">{account.creative_count}</TableCell>
              <TableCell>
                {account.untagged_count > 0 ? (
                  <Badge variant="outline" className="bg-tag-untagged/10 text-tag-untagged border-tag-untagged/30 text-xs">
                    {account.untagged_count}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">0</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(account.last_synced_at)}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
