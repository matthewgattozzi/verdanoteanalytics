import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  RefreshCw,
  Clock,
  Upload,
  Pencil,
} from "lucide-react";
import { useState, useRef } from "react";
import {
  useAccounts,
  useToggleAccount,
  useRenameAccount,
  useUploadMappings,
  useSync,
  useUpdateAccountSettings,
} from "@/hooks/useApi";
import { useAccountContext } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { isBuilder } = useAuth();
  const { selectedAccountId, selectedAccount } = useAccountContext();
  const { data: rawAccounts } = useAccounts();
  const accounts = [...(rawAccounts || [])].sort((a: any, b: any) => a.name.localeCompare(b.name));

  const toggleAccount = useToggleAccount();
  const renameAccount = useRenameAccount();
  const uploadMappings = useUploadMappings();
  const updateAccountSettings = useUpdateAccountSettings();
  const sync = useSync();

  const [renamingAccount, setRenamingAccount] = useState<{ id: string; name: string } | null>(null);
  const [showCsvModal, setShowCsvModal] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvMappings, setCsvMappings] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account settings state
  const account = selectedAccountId === "all"
    ? null
    : (accounts || []).find((a: any) => a.id === selectedAccountId);

  const [dateRange, setDateRange] = useState("");
  const [roasThreshold, setRoasThreshold] = useState("");
  const [spendThreshold, setSpendThreshold] = useState("");
  const [primaryKpi, setPrimaryKpi] = useState("");
  const [secondaryKpis, setSecondaryKpis] = useState("");
  const [companyPdfUrl, setCompanyPdfUrl] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [initialized, setInitialized] = useState<string | null>(null);

  // Sync local state when account changes
  if (account && initialized !== account.id) {
    setDateRange(String(account.date_range_days || 30));
    setRoasThreshold(String(account.winner_roas_threshold || 2.0));
    setSpendThreshold(String(account.iteration_spend_threshold || 50));
    setPrimaryKpi(account.primary_kpi || "Purchase ROAS > 1.5x");
    setSecondaryKpis(account.secondary_kpis || "CTR, Hook Rate, Volume");
    setCompanyPdfUrl((account as any).company_pdf_url || null);
    setInitialized(account.id);
  }

  const handleSave = () => {
    if (!account) return;
    updateAccountSettings.mutate({
      id: account.id,
      date_range_days: parseInt(dateRange) || 30,
      winner_roas_threshold: parseFloat(roasThreshold) || 2.0,
      iteration_spend_threshold: parseFloat(spendThreshold) || 50,
      primary_kpi: primaryKpi || null,
      secondary_kpis: secondaryKpis || null,
    });
  };

  const handleApplyToAll = () => {
    (accounts || []).forEach((acc: any) => {
      updateAccountSettings.mutate({
        id: acc.id,
        date_range_days: parseInt(dateRange) || 30,
        winner_roas_threshold: parseFloat(roasThreshold) || 2.0,
        iteration_spend_threshold: parseFloat(spendThreshold) || 50,
      });
    });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast({ title: "Invalid CSV", description: "File must have headers and at least one row.", variant: "destructive" }); return; }
      const headers = lines[0].split(",").map((h) => h.trim());
      const required = ["UniqueCode", "Type", "Person", "Style", "Product", "Hook", "Theme"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) { toast({ title: "Missing columns", description: `Required: ${missing.join(", ")}`, variant: "destructive" }); return; }
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

  if (!account) {
    return (
      <AppLayout>
        <PageHeader title="Account Settings" description="Select a specific ad account from the sidebar to view its settings." />
        <div className="max-w-2xl">
          <div className="glass-panel p-8 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Please select a specific ad account from the sidebar switcher to configure its settings.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={`${account.name} — Settings`}
        description="Configure sync preferences and AI context for this account."
      />

      <div className="max-w-2xl space-y-8">
        {/* Account Overview */}
        <section className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Account Overview</h2>
              <p className="text-[11px] font-mono text-muted-foreground">{account.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setRenamingAccount({ id: account.id, name: account.name })} title="Rename">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => sync.mutate({ account_id: account.id })} disabled={sync.isPending}>
                {sync.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Sync
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowCsvModal(account.id); setCsvPreview([]); setCsvMappings([]); }}>
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
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>

        {/* AI Business Context */}
        <section className="glass-panel p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">AI Analysis Context</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Helps AI understand your business for better creative analysis. Company name is pulled from the account name.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Company Info PDF</Label>
            <p className="text-[11px] text-muted-foreground">Upload a PDF with details about the company, products, target audience, etc. This context helps the AI produce more relevant analysis.</p>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) {
                    toast({ title: "File too large", description: "Max 10MB.", variant: "destructive" });
                    return;
                  }
                  setUploadingPdf(true);
                  try {
                    const filePath = `${account.id}/${Date.now()}_${file.name}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage.from("company-docs").upload(filePath, file, { upsert: true });
                    if (uploadError) throw uploadError;
                    const pdfUrl = `company-docs/${uploadData.path}`;
                    await updateAccountSettings.mutateAsync({
                      id: account.id,
                      company_pdf_url: pdfUrl,
                    });
                    setCompanyPdfUrl(pdfUrl);
                    toast({ title: "PDF uploaded", description: "Company info PDF saved successfully." });
                  } catch (err: any) {
                    toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                  } finally {
                    setUploadingPdf(false);
                    e.target.value = "";
                  }
                }}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-accent cursor-pointer"
                disabled={uploadingPdf}
              />
              {uploadingPdf && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {companyPdfUrl && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Badge variant="outline" className="text-xs">PDF uploaded</Badge>
                <span className="truncate max-w-[200px]">{companyPdfUrl.split("/").pop()}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={async () => {
                    const path = companyPdfUrl.replace("company-docs/", "");
                    await supabase.storage.from("company-docs").remove([path]);
                    await updateAccountSettings.mutateAsync({ id: account.id, company_pdf_url: null });
                    setCompanyPdfUrl(null);
                    toast({ title: "PDF removed" });
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Primary KPI</Label>
              <Input value={primaryKpi} onChange={(e) => setPrimaryKpi(e.target.value)} placeholder="e.g. Purchase ROAS > 1.5x" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Secondary KPIs</Label>
              <Input value={secondaryKpis} onChange={(e) => setSecondaryKpis(e.target.value)} placeholder="e.g. CTR, Hook Rate, Volume" className="bg-background" />
            </div>
          </div>
        </section>

        {/* Sync Settings */}
        <section className="glass-panel p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Sync Settings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Configure data range and thresholds for this account.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Date Range (days)</Label>
              <Input type="number" value={dateRange} onChange={(e) => setDateRange(e.target.value)} min="1" max="365" className="bg-background" />
              <p className="text-[11px] text-muted-foreground">How many days of data to pull on each sync.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Winner ROAS Threshold</Label>
              <Input type="number" value={roasThreshold} onChange={(e) => setRoasThreshold(e.target.value)} step="0.1" min="0" className="bg-background" />
              <p className="text-[11px] text-muted-foreground">Minimum ROAS to consider a creative a "winner".</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Iteration Spend Threshold ($)</Label>
              <Input type="number" value={spendThreshold} onChange={(e) => setSpendThreshold(e.target.value)} min="0" className="bg-background" />
              <p className="text-[11px] text-muted-foreground">Minimum spend to include in iteration analysis.</p>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={updateAccountSettings.isPending}>
              {updateAccountSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Settings
            </Button>
            {accounts.length > 1 && (
              <Button size="sm" variant="outline" onClick={handleApplyToAll} disabled={updateAccountSettings.isPending}>
                Apply to All Accounts
              </Button>
            )}
          </div>
        </section>
      </div>

      {/* Rename Account Modal */}
      <Dialog open={!!renamingAccount} onOpenChange={() => setRenamingAccount(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>Enter a new display name for this account.</DialogDescription>
          </DialogHeader>
          <Input
            value={renamingAccount?.name || ""}
            onChange={(e) => setRenamingAccount(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder="Account name"
            className="bg-background"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingAccount(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (renamingAccount && renamingAccount.name.trim()) {
                  renameAccount.mutate({ id: renamingAccount.id, name: renamingAccount.name.trim() });
                  setRenamingAccount(null);
                }
              }}
              disabled={!renamingAccount?.name.trim() || renameAccount.isPending}
            >
              {renameAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
