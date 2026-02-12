import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Building2,
  Plus,
  Trash2,
  Upload,
  RefreshCw,
  Loader2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useState, useRef } from "react";
import {
  useAccounts,
  useAddAccount,
  useDeleteAccount,
  useToggleAccount,
  useUploadMappings,
  useSync,
  useTestMeta,
  useSettings,
} from "@/hooks/useApi";
import { toast } from "@/hooks/use-toast";

const AccountsPage = () => {
  const { data: accounts, isLoading } = useAccounts();
  const { data: settings } = useSettings();
  const addAccount = useAddAccount();
  const deleteAccount = useDeleteAccount();
  const toggleAccount = useToggleAccount();
  const uploadMappings = useUploadMappings();
  const testMeta = useTestMeta();
  const sync = useSync();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCsvModal, setShowCsvModal] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvMappings, setCsvMappings] = useState<any[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    setLoadingAccounts(true);
    try {
      const result = await testMeta.mutateAsync(undefined);
      if (result.connected) {
        setAvailableAccounts(result.accounts || []);
      } else {
        toast({ title: "Not connected", description: "Add your Meta token in Settings first.", variant: "destructive" });
        setShowAddModal(false);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch accounts. Check your Meta token.", variant: "destructive" });
      setShowAddModal(false);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAddAccount = async (account: { id: string; name: string }) => {
    await addAccount.mutateAsync(account);
    // Trigger initial sync
    sync.mutate({ account_id: account.id, sync_type: "initial" });
    setShowAddModal(false);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "File must have headers and at least one row.", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const required = ["UniqueCode", "Type", "Person", "Style", "Product", "Hook", "Theme"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        toast({ title: "Missing columns", description: `Required: ${missing.join(", ")}`, variant: "destructive" });
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });

      setCsvPreview(rows.slice(0, 5));
      setCsvMappings(rows);
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvUpload = async () => {
    if (!showCsvModal || csvMappings.length === 0) return;
    await uploadMappings.mutateAsync({ accountId: showCsvModal, mappings: csvMappings });
    setShowCsvModal(null);
    setCsvPreview([]);
    setCsvMappings([]);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const existingIds = new Set((accounts || []).map((a: any) => a.id));

  return (
    <AppLayout>
      <PageHeader
        title="Accounts"
        description="Manage your connected Meta ad accounts."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => sync.mutate({ account_id: "all" })} disabled={sync.isPending || !accounts?.length}>
              {sync.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Sync All
            </Button>
            <Button size="sm" onClick={handleOpenAddModal}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Account
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !accounts?.length ? (
        <div className="glass-panel flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No accounts connected</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            {settings?.meta_access_token_set === "true"
              ? "Click 'Add Account' to connect an ad account from your Meta Business."
              : "Connect your Meta access token in Settings first, then add ad accounts here."}
          </p>
          {settings?.meta_access_token_set !== "true" && (
            <Button variant="outline" size="sm" asChild>
              <a href="/settings">Go to Settings</a>
            </Button>
          )}
        </div>
      ) : (
        <div className="glass-panel overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Creatives</TableHead>
                <TableHead>Untagged</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account: any) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{account.id}</TableCell>
                  <TableCell>
                    <Switch
                      checked={account.is_active}
                      onCheckedChange={(checked) => toggleAccount.mutate({ id: account.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>{account.creative_count}</TableCell>
                  <TableCell>
                    {account.untagged_count > 0 ? (
                      <Badge variant="outline" className="bg-tag-untagged/10 text-tag-untagged border-tag-untagged/30 text-xs">
                        {account.untagged_count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(account.last_synced_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => sync.mutate({ account_id: account.id })} disabled={sync.isPending}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowCsvModal(account.id); setCsvPreview([]); setCsvMappings([]); }}>
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(account.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Account Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ad Account</DialogTitle>
            <DialogDescription>Select an account from your Meta Business to connect.</DialogDescription>
          </DialogHeader>
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No ad accounts found for this token.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {availableAccounts.map((acc) => (
                <button
                  key={acc.id}
                  disabled={existingIds.has(acc.id) || addAccount.isPending}
                  onClick={() => handleAddAccount({ id: acc.id, name: acc.name })}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the account and all its creatives and name mappings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (showDeleteConfirm) deleteAccount.mutate(showDeleteConfirm); setShowDeleteConfirm(null); }}
            >
              Remove Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Upload Modal */}
      <Dialog open={!!showCsvModal} onOpenChange={() => { setShowCsvModal(null); setCsvPreview([]); setCsvMappings([]); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Name Mappings</DialogTitle>
            <DialogDescription>
              Upload a CSV with columns: UniqueCode, Type, Person, Style, Product, Hook, Theme
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-accent cursor-pointer"
            />
            {csvPreview.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Preview (first 5 rows of {csvMappings.length}):</p>
                <div className="overflow-x-auto border border-border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">UniqueCode</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Person</TableHead>
                        <TableHead className="text-xs">Style</TableHead>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-xs">Hook</TableHead>
                        <TableHead className="text-xs">Theme</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{row.UniqueCode}</TableCell>
                          <TableCell className="text-xs">{row.Type}</TableCell>
                          <TableCell className="text-xs">{row.Person}</TableCell>
                          <TableCell className="text-xs">{row.Style}</TableCell>
                          <TableCell className="text-xs">{row.Product}</TableCell>
                          <TableCell className="text-xs">{row.Hook}</TableCell>
                          <TableCell className="text-xs">{row.Theme}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCsvModal(null); setCsvPreview([]); setCsvMappings([]); }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCsvUpload} disabled={csvMappings.length === 0 || uploadMappings.isPending}>
              {uploadMappings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Upload {csvMappings.length} Mappings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AccountsPage;
