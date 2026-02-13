import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  availableAccounts: any[];
  existingIds: Set<string>;
  onAdd: (account: { id: string; name: string }) => void;
  addPending: boolean;
}

export function AddAccountModal({ open, onOpenChange, loading, availableAccounts, existingIds, onAdd, addPending }: AddAccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Ad Account</DialogTitle>
          <DialogDescription>Select an account from your Meta Business to connect.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : availableAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No ad accounts found.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {availableAccounts.map((acc) => (
              <button
                key={acc.id}
                disabled={existingIds.has(acc.id) || addPending}
                onClick={() => onAdd({ id: acc.id, name: acc.name })}
                className="w-full flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
              >
                <div>
                  <div className="text-sm font-medium">{acc.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{acc.id}</div>
                </div>
                {existingIds.has(acc.id) ? (
                  <Badge variant="outline" className="text-xs">Added</Badge>
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
