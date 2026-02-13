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
import { AccountOverviewSection } from "@/components/settings/AccountOverviewSection";
import { AIContextSection } from "@/components/settings/AIContextSection";
import { SyncSettingsSection } from "@/components/settings/SyncSettingsSection";
import { SyncHistorySection } from "@/components/settings/SyncHistorySection";
import { useSettingsPageState } from "@/hooks/useSettingsPageState";

const SettingsPage = () => {
  const s = useSettingsPageState();

  if (!s.account) {
    if (s.accounts.length > 0) {
      return (
        <AppLayout>
          <PageHeader title="Account Settings" description="Select a specific ad account from the sidebar to view its settings." />
          <div className="max-w-2xl">
            <div className="glass-panel p-6 space-y-4">
              <p className="text-sm text-muted-foreground mb-3">Select an account to configure its settings:</p>
              <div className="space-y-2">
                {s.accounts.map((acc: any) => (
                  <button key={acc.id} onClick={() => s.setSelectedAccountId(acc.id)}
                    className="w-full flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent transition-colors text-left">
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
            <p className="text-sm text-muted-foreground">Add ad accounts in User Settings → Admin to get started.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={`${s.account.name} — Settings`} description="Configure sync preferences and AI context for this account." />

      <div className="max-w-2xl space-y-8">
        <AccountOverviewSection
          account={s.account}
          onRename={() => s.setRenamingAccount({ id: s.account!.id, name: s.account!.name })}
          onSync={() => s.sync.mutate({ account_id: s.account!.id })}
          syncPending={s.sync.isPending}
          onUploadCsv={() => { s.setShowCsvModal(s.account!.id); s.setCsvPreview([]); s.setCsvMappings([]); }}
          onToggle={(checked) => s.toggleAccount.mutate({ id: s.account!.id, is_active: checked })}
        />

        <AIContextSection
          account={s.account}
          primaryKpi={s.primaryKpi} setPrimaryKpi={s.setPrimaryKpi}
          secondaryKpis={s.secondaryKpis} setSecondaryKpis={s.setSecondaryKpis}
          companyPdfUrl={s.companyPdfUrl} setCompanyPdfUrl={s.setCompanyPdfUrl}
          creativePrompt={s.creativePrompt} setCreativePrompt={s.setCreativePrompt}
          insightsPrompt={s.insightsPrompt} setInsightsPrompt={s.setInsightsPrompt}
          onSaveSettings={async (updates) => { await s.updateAccountSettings.mutateAsync({ id: s.account!.id, ...updates }); }}
          onApplyPromptsToAll={s.handleApplyPromptsToAll}
          applyingToAll={s.applyingPrompts} applyProgress={s.applyProgress}
          showApplyAll={s.accounts.length > 1}
        />

        <SyncSettingsSection
          dateRange={s.dateRange} setDateRange={s.setDateRange}
          roasThreshold={s.roasThreshold} setRoasThreshold={s.setRoasThreshold}
          spendThreshold={s.spendThreshold} setSpendThreshold={s.setSpendThreshold}
          winnerKpi={s.winnerKpi} setWinnerKpi={s.setWinnerKpi}
          winnerKpiDirection={s.winnerKpiDirection} setWinnerKpiDirection={s.setWinnerKpiDirection}
          winnerKpiThreshold={s.winnerKpiThreshold} setWinnerKpiThreshold={s.setWinnerKpiThreshold}
          scaleThreshold={s.scaleThreshold} setScaleThreshold={s.setScaleThreshold}
          killThreshold={s.killThreshold} setKillThreshold={s.setKillThreshold}
          onSave={s.handleSave} onApplyToAll={s.handleApplyToAll}
          saving={s.updateAccountSettings.isPending} showApplyAll={s.accounts.length > 1}
        />

        <SyncHistorySection accountId={s.account.id} />
      </div>

      {/* Rename Account Modal */}
      <Dialog open={!!s.renamingAccount} onOpenChange={() => s.setRenamingAccount(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>Enter a new display name for this account.</DialogDescription>
          </DialogHeader>
          <Input
            value={s.renamingAccount?.name || ""}
            onChange={(e) => s.setRenamingAccount(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder="Account name" className="bg-background"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => s.setRenamingAccount(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (s.renamingAccount && s.renamingAccount.name.trim()) {
                  s.renameAccount.mutate({ id: s.renamingAccount.id, name: s.renamingAccount.name.trim() });
                  s.setRenamingAccount(null);
                }
              }}
              disabled={!s.renamingAccount?.name.trim() || s.renameAccount.isPending}
            >
              {s.renameAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Modal */}
      <Dialog open={!!s.showCsvModal} onOpenChange={() => { s.setShowCsvModal(null); s.setCsvPreview([]); s.setCsvMappings([]); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Name Mappings</DialogTitle>
            <DialogDescription>Upload a CSV with columns: UniqueCode, Type, Person, Style, Product, Hook, Theme</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input ref={s.fileInputRef} type="file" accept=".csv" onChange={s.handleCsvUpload}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-accent cursor-pointer" />
            {s.csvPreview.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Preview (first 5 rows of {s.csvMappings.length}):</p>
                <div className="overflow-x-auto border border-border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["UniqueCode", "Type", "Person", "Style", "Product", "Hook", "Theme"].map(h => (
                          <TableHead key={h} className="text-xs">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.csvPreview.map((row, i) => (
                        <TableRow key={i}>
                          {["UniqueCode", "Type", "Person", "Style", "Product", "Hook", "Theme"].map(h => (
                            <TableCell key={h} className={`text-xs ${h === "UniqueCode" ? "font-mono" : ""}`}>{row[h]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { s.setShowCsvModal(null); s.setCsvPreview([]); s.setCsvMappings([]); }}>Cancel</Button>
            <Button onClick={s.handleConfirmCsvUpload} disabled={s.csvMappings.length === 0 || s.uploadMappings.isPending}>
              {s.uploadMappings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Upload {s.csvMappings.length} Mappings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SettingsPage;
