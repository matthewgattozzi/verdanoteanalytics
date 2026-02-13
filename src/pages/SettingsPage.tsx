import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useAccounts, useToggleAccount, useRenameAccount, useUploadMappings, useSync, useUpdateAccountSettings,
} from "@/hooks/useApi";
import { useAccountContext } from "@/contexts/AccountContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AccountOverviewSection } from "@/components/settings/AccountOverviewSection";
import { AIContextSection, DEFAULT_CREATIVE_PROMPT, DEFAULT_INSIGHTS_PROMPT } from "@/components/settings/AIContextSection";
import { SyncSettingsSection } from "@/components/settings/SyncSettingsSection";
import { SyncHistorySection } from "@/components/settings/SyncHistorySection";

const SettingsPage = () => {
  const { isBuilder } = useAuth();
  const { selectedAccountId, selectedAccount, setSelectedAccountId } = useAccountContext();
  const { data: rawAccounts } = useAccounts();
  const accounts = [...(rawAccounts || [])].sort((a: any, b: any) => a.name.localeCompare(b.name));

  const toggleAccount = useToggleAccount();
  const renameAccount = useRenameAccount();
  const uploadMappings = useUploadMappings();
  const updateAccountSettings = useUpdateAccountSettings();
  const sync = useSync();
  const queryClient = useQueryClient();

  const [renamingAccount, setRenamingAccount] = useState<{ id: string; name: string } | null>(null);
  const [showCsvModal, setShowCsvModal] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvMappings, setCsvMappings] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const account = selectedAccountId === "all"
    ? null
    : (accounts || []).find((a: any) => a.id === selectedAccountId);

  const [dateRange, setDateRange] = useState("");
  const [roasThreshold, setRoasThreshold] = useState("");
  const [spendThreshold, setSpendThreshold] = useState("");
  const [winnerKpi, setWinnerKpi] = useState("roas");
  const [winnerKpiDirection, setWinnerKpiDirection] = useState("gte");
  const [winnerKpiThreshold, setWinnerKpiThreshold] = useState("2.0");
  const [scaleThreshold, setScaleThreshold] = useState("2.0");
  const [killThreshold, setKillThreshold] = useState("1.0");
  const [primaryKpi, setPrimaryKpi] = useState("");
  const [secondaryKpis, setSecondaryKpis] = useState("");
  const [companyPdfUrl, setCompanyPdfUrl] = useState<string | null>(null);
  const [creativePrompt, setCreativePrompt] = useState("");
  const [insightsPrompt, setInsightsPrompt] = useState("");
  const [initialized, setInitialized] = useState<string | null>(null);

  if (account && initialized !== account.id) {
    setDateRange(String(account.date_range_days || 30));
    setRoasThreshold(String(account.winner_roas_threshold || 2.0));
    setSpendThreshold(String(account.iteration_spend_threshold || 50));
    setWinnerKpi(account.winner_kpi || "roas");
    setWinnerKpiDirection(account.winner_kpi_direction || "gte");
    setWinnerKpiThreshold(String(account.winner_kpi_threshold ?? account.winner_roas_threshold ?? 2.0));
    setScaleThreshold(String(account.scale_threshold ?? 2.0));
    setKillThreshold(String(account.kill_threshold ?? 1.0));
    setPrimaryKpi(account.primary_kpi || "Purchase ROAS > 1.5x");
    setSecondaryKpis(account.secondary_kpis || "CTR, Hook Rate, Volume");
    setCompanyPdfUrl((account as any).company_pdf_url || null);
    setCreativePrompt((account as any).creative_analysis_prompt || DEFAULT_CREATIVE_PROMPT);
    setInsightsPrompt((account as any).insights_prompt || DEFAULT_INSIGHTS_PROMPT);
    setInitialized(account.id);
  }

  const handleSave = () => {
    if (!account) return;
    updateAccountSettings.mutate({
      id: account.id,
      date_range_days: parseInt(dateRange) || 30,
      winner_roas_threshold: parseFloat(roasThreshold) || 2.0,
      iteration_spend_threshold: parseFloat(spendThreshold) || 50,
      winner_kpi: winnerKpi,
      winner_kpi_direction: winnerKpiDirection,
      winner_kpi_threshold: parseFloat(winnerKpiThreshold) || 2.0,
      scale_threshold: parseFloat(scaleThreshold) || 2.0,
      kill_threshold: parseFloat(killThreshold) || 1.0,
      primary_kpi: primaryKpi || null,
      secondary_kpis: secondaryKpis || null,
      creative_analysis_prompt: creativePrompt === DEFAULT_CREATIVE_PROMPT ? null : creativePrompt || null,
      insights_prompt: insightsPrompt === DEFAULT_INSIGHTS_PROMPT ? null : insightsPrompt || null,
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

  const [applyingPrompts, setApplyingPrompts] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });

  const handleApplyPromptsToAll = async () => {
    const allAccounts = (accounts || []) as any[];
    const promptValues: Record<string, string | null> = {
      creative_analysis_prompt: creativePrompt === DEFAULT_CREATIVE_PROMPT ? null : creativePrompt || null,
      insights_prompt: insightsPrompt === DEFAULT_INSIGHTS_PROMPT ? null : insightsPrompt || null,
    };
    setApplyingPrompts(true);
    setApplyProgress({ current: 0, total: allAccounts.length });
    try {
      const ids = allAccounts.map((a: any) => a.id);
      const { error } = await supabase
        .from("ad_accounts")
        .update(promptValues)
        .in("id", ids);
      if (error) throw error;
      setApplyProgress({ current: allAccounts.length, total: allAccounts.length });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(`Prompts applied to all ${allAccounts.length} accounts`);
    } catch (e: any) {
      toast.error("Failed to apply prompts", { description: e.message });
    } finally {
      setApplyingPrompts(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast.error("Invalid CSV — file must have headers and at least one row."); return; }
      const headers = lines[0].split(",").map((h) => h.trim());
      const required = ["UniqueCode", "Type", "Person", "Style", "Product", "Hook", "Theme"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) { toast.error(`Missing columns: ${missing.join(", ")}`); return; }
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

  if (!account) {
    // Auto-select first account if available
    if (accounts.length > 0) {
      return (
        <AppLayout>
          <PageHeader title="Account Settings" description="Select a specific ad account from the sidebar to view its settings." />
          <div className="max-w-2xl">
            <div className="glass-panel p-6 space-y-4">
              <p className="text-sm text-muted-foreground mb-3">
                Select an account to configure its settings:
              </p>
              <div className="space-y-2">
                {accounts.map((acc: any) => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className="w-full flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm font-medium">{acc.name}</div>
                      <div className="text-xs text-muted-foreground">{acc.creative_count} creatives</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AppLayout>
      );
    }

    return (
      <AppLayout>
        <PageHeader title="Account Settings" description="No ad accounts configured yet." />
        <div className="max-w-2xl">
          <div className="glass-panel p-8 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Add ad accounts in User Settings → Admin to get started.
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
        <AccountOverviewSection
          account={account}
          onRename={() => setRenamingAccount({ id: account.id, name: account.name })}
          onSync={() => sync.mutate({ account_id: account.id })}
          syncPending={sync.isPending}
          onUploadCsv={() => { setShowCsvModal(account.id); setCsvPreview([]); setCsvMappings([]); }}
          onToggle={(checked) => toggleAccount.mutate({ id: account.id, is_active: checked })}
        />

        <AIContextSection
          account={account}
          primaryKpi={primaryKpi}
          setPrimaryKpi={setPrimaryKpi}
          secondaryKpis={secondaryKpis}
          setSecondaryKpis={setSecondaryKpis}
          companyPdfUrl={companyPdfUrl}
          setCompanyPdfUrl={setCompanyPdfUrl}
          creativePrompt={creativePrompt}
          setCreativePrompt={setCreativePrompt}
          insightsPrompt={insightsPrompt}
          setInsightsPrompt={setInsightsPrompt}
          onSaveSettings={async (updates) => {
            await updateAccountSettings.mutateAsync({ id: account.id, ...updates });
          }}
          onApplyPromptsToAll={handleApplyPromptsToAll}
          applyingToAll={applyingPrompts}
          applyProgress={applyProgress}
          showApplyAll={accounts.length > 1}
        />

        <SyncSettingsSection
          dateRange={dateRange}
          setDateRange={setDateRange}
          roasThreshold={roasThreshold}
          setRoasThreshold={setRoasThreshold}
          spendThreshold={spendThreshold}
          setSpendThreshold={setSpendThreshold}
          winnerKpi={winnerKpi}
          setWinnerKpi={setWinnerKpi}
          winnerKpiDirection={winnerKpiDirection}
          setWinnerKpiDirection={setWinnerKpiDirection}
          winnerKpiThreshold={winnerKpiThreshold}
          setWinnerKpiThreshold={setWinnerKpiThreshold}
          scaleThreshold={scaleThreshold}
          setScaleThreshold={setScaleThreshold}
          killThreshold={killThreshold}
          setKillThreshold={setKillThreshold}
          onSave={handleSave}
          onApplyToAll={handleApplyToAll}
          saving={updateAccountSettings.isPending}
          showApplyAll={accounts.length > 1}
        />

        <SyncHistorySection accountId={account.id} />
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
