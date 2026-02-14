import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, RefreshCw, Loader2, Building2, Pencil, Image } from "lucide-react";

interface AdAccountsSectionProps {
  accounts: any[];
  syncPending: boolean;
  onSyncAll: () => void;
  onRefreshAllMedia: () => void;
  refreshAllMediaPending: boolean;
  onOpenAddModal: () => void;
  onRename: (account: { id: string; name: string }) => void;
  onDelete: (id: string) => void;
}

export function AdAccountsSection({ accounts, syncPending, onSyncAll, onRefreshAllMedia, refreshAllMediaPending, onOpenAddModal, onRename, onDelete }: AdAccountsSectionProps) {
  return (
    <section className="glass-panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Ad Accounts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Add or remove Meta ad accounts.</p>
        </div>
        <div className="flex gap-2">
          {accounts?.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={onSyncAll} disabled={syncPending}>
                {syncPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Sync All
              </Button>
              <Button size="sm" variant="outline" onClick={onRefreshAllMedia} disabled={refreshAllMediaPending}>
                {refreshAllMediaPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Image className="h-3.5 w-3.5 mr-1.5" />}
                Refresh All Media
              </Button>
            </>
          )}
          <Button size="sm" onClick={onOpenAddModal}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add
          </Button>
        </div>
      </div>

      {!accounts?.length ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Click 'Add' to connect an ad account from your Meta Business.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Creatives</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acc: any) => (
                <TableRow key={acc.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{acc.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{acc.id}</div>
                  </TableCell>
                  <TableCell className="text-sm">{acc.creative_count}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => onRename({ id: acc.id, name: acc.name })} title="Rename">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(acc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
