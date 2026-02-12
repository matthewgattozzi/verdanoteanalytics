import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Upload,
  RefreshCw,
  Clock,
  Building2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  useSettings,
  useSaveSettings,
  useTestMeta,
  useAccounts,
  useAddAccount,
  useDeleteAccount,
  useToggleAccount,
  useUploadMappings,
  useSync,
} from "@/hooks/useApi";
import { toast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const [showToken, setShowToken] = useState(false);
  const [metaToken, setMetaToken] = useState("");
  const [dateRange, setDateRange] = useState("30");
  const [roasThreshold, setRoasThreshold] = useState("2.0");
  const [spendThreshold, setSpendThreshold] = useState("50");
  const [metaStatus, setMetaStatus] = useState<"unknown" | "connected" | "disconnected" | "testing">("unknown");
  const [metaUser, setMetaUser] = useState<string | null>(null);

  // Account management state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCsvModal, setShowCsvModal] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvMappings, setCsvMappings] = useState<any[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const saveSettings = useSaveSettings();
  const testMeta = useTestMeta();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const addAccount = useAddAccount();
  const deleteAccount = useDeleteAccount();
  const toggleAccount = useToggleAccount();
  const uploadMappings = useUploadMappings();
  const sync = useSync();

  useEffect(() => {
    if (settings) {
      setDateRange(settings.date_range_days || "30");
      setRoasThreshold(settings.winner_roas_threshold || "2.0");
      setSpendThreshold(settings.iteration_spend_threshold || "50");
      setMetaStatus(settings.meta_access_token_set === "true" ? "connected" : "disconnected");
    }
  }, [settings]);

  const handleSaveToken = async () => {
    if (!metaToken) return;
    setMetaStatus("testing");
    try {
      await saveSettings.mutateAsync({ meta_access_token: metaToken });
      const result = await testMeta.mutateAsync(metaToken);
      if (result.connected) {
        setMetaStatus("connected");
        setMetaUser(result.user?.name || null);
        toast({ title: "Connected to Meta", description: `Logged in as ${result.user?.name}. ${result.accounts?.length || 0} ad accounts found.` });
        if (result.tokenWarning) {
          toast({ title: "Token warning", description: result.tokenWarning, variant: "destructive" });
        }
      } else {
        setMetaStatus("disconnected");
        toast({ title: "Connection failed", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      setMetaStatus("disconnected");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setMetaToken("");
  };

  const handleSaveSettings = () => {
    saveSettings.mutate({
      date_range_days: dateRange,
      winner_roas_threshold: roasThreshold,
      iteration_spend_threshold: spendThreshold,
    });
  };

  // Account handlers
  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    setLoadingAccounts(true);
    try {
      const result = await testMeta.mutateAsync(undefined);
      if (result.connected) {
        setAvailableAccounts(result.accounts || []);
      } else {
        toast({ title: "Not connected", description: "Add your Meta token first.", variant: "destructive" });
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
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
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
  const isLoading = settingsLoading || accountsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Configure your Meta connection, ad accounts, and sync preferences."
      />

      <div className="max-w-2xl space-y-8">
        {/* Meta Access Token */}
        <section className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Meta Access Token</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use a long-lived token (60 days). Short-lived tokens expire in ~1 hour.
              </p>
            </div>
            <Badge variant="outline" className="gap-1.5">
              {metaStatus === "testing" ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Testing</>
              ) : metaStatus === "connected" ? (
                <><CheckCircle2 className="h-3 w-3 text-success" /> {metaUser || "Connected"}</>
              ) : (
                <><XCircle className="h-3 w-3 text-destructive" /> Not Connected</>
              )}
            </Badge>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? "text" : "password"}
                placeholder={settings?.meta_access_token_set === "true" ? "Token saved (enter new to replace)" : "Enter your Meta access token..."}
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                className="pr-10 bg-background"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={handleSaveToken} disabled={!metaToken || metaStatus === "testing"}>
              {metaStatus === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Connect"}
            </Button>
          </div>
        </section>

        {/* Ad Accounts */}
        <section className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Ad Accounts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect and manage your Meta ad accounts. Toggle accounts on/off to control which ones sync.
              </p>
            </div>
            <div className="flex gap-2">
              {accounts?.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => sync.mutate({ account_id: "all" })} disabled={sync.isPending}>
                  {sync.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Sync All
                </Button>
              )}
              <Button size="sm" onClick={handleOpenAddModal}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add
              </Button>
            </div>
          </div>

          {!accounts?.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {settings?.meta_access_token_set === "true"
                  ? "Click 'Add' to connect an ad account from your Meta Business."
                  : "Save your Meta access token above first."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Creatives</TableHead>
                    <TableHead>Untagged</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account: any) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{account.name}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">{account.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={account.is_active}
                          onCheckedChange={(checked) => toggleAccount.mutate({ id: account.id, is_active: checked })}
                        />
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => sync.mutate({ account_id: account.id })} disabled={sync.isPending} title="Sync">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setShowCsvModal(account.id); setCsvPreview([]); setCsvMappings([]); }} title="Upload CSV">
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(account.id)} title="Remove">
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
        </section>

        {/* Sync Settings */}
        <section className="glass-panel p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Sync Settings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure how data is pulled from Meta and how creatives are evaluated.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateRange" className="text-sm">Date Range (days)</Label>
              <Input id="dateRange" type="number" value={dateRange} onChange={(e) => setDateRange(e.target.value)} min="1" max="365" className="bg-background" />
              <p className="text-[11px] text-muted-foreground">How many days of data to pull on each sync.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roasThreshold" className="text-sm">Winner ROAS Threshold</Label>
              <Input id="roasThreshold" type="number" value={roasThreshold} onChange={(e) => setRoasThreshold(e.target.value)} step="0.1" min="0" className="bg-background" />
              <p className="text-[11px] text-muted-foreground">Minimum ROAS to consider a creative a "winner" (BOF).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spendThreshold" className="text-sm">Iteration Spend Threshold ($)</Label>
              <Input id="spendThreshold" type="number" value={spendThreshold} onChange={(e) => setSpendThreshold(e.target.value)} min="0" className="bg-background" />
              <p className="text-[11px] text-muted-foreground">Minimum spend to include a creative in iteration analysis.</p>
            </div>
          </div>
          <div className="pt-2">
            <Button size="sm" onClick={handleSaveSettings} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Settings
            </Button>
          </div>
        </section>

        {/* AI Analysis Info */}
        <section className="glass-panel p-6 space-y-2">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-semibold">AI Creative Analysis</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI-powered creative breakdowns are built in — no API key needed. Analysis runs automatically when you click "Analyze" on any creative or use bulk analysis.
              </p>
            </div>
            <Badge variant="outline" className="gap-1.5 flex-shrink-0">
              <CheckCircle2 className="h-3 w-3 text-success" /> Built-in
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            AI analysis generates qualitative breakdowns of each ad's hook, visuals, and CTA strategy. This does NOT affect tags — tags come from your naming convention.
          </p>
        </section>
      </div>

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

export default SettingsPage;
