import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface RenameAccountModalProps {
  account: { id: string; name: string } | null;
  onClose: () => void;
  onRename: (params: { id: string; name: string }) => void;
  onChange: (account: { id: string; name: string } | null) => void;
  isPending: boolean;
}

export function RenameAccountModal({ account, onClose, onRename, onChange, isPending }: RenameAccountModalProps) {
  return (
    <Dialog open={!!account} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Account</DialogTitle>
          <DialogDescription>Enter a new display name for this account.</DialogDescription>
        </DialogHeader>
        <Input
          value={account?.name || ""}
          onChange={(e) => onChange(account ? { ...account, name: e.target.value } : null)}
          placeholder="Account name" className="bg-background"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (account && account.name.trim()) {
                onRename({ id: account.id, name: account.name.trim() });
                onClose();
              }
            }}
            disabled={!account?.name.trim() || isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
