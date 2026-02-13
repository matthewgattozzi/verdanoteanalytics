import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { AccountOverviewSection } from "@/components/settings/AccountOverviewSection";

import { SyncSettingsSection } from "@/components/settings/SyncSettingsSection";
import { SyncHistorySection } from "@/components/settings/SyncHistorySection";
import { RenameAccountModal } from "@/components/settings/RenameAccountModal";
import { CsvUploadModal } from "@/components/settings/CsvUploadModal";
import { useSettingsPageState } from "@/hooks/useSettingsPageState";
import { useIsSyncing } from "@/hooks/useIsSyncing";

const SettingsPage = () => {
  const s = useSettingsPageState();
  const isSyncing = useIsSyncing();

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
      <PageHeader title={`${s.account.name} — Settings`} description="Configure sync preferences for this account." />

      <div className="max-w-2xl space-y-8">
        <AccountOverviewSection
          account={s.account}
          onRename={() => s.setRenamingAccount({ id: s.account!.id, name: s.account!.name })}
          onSync={() => s.sync.mutate({ account_id: s.account!.id })}
          syncPending={s.sync.isPending || isSyncing}
          onUploadCsv={() => { s.setShowCsvModal(s.account!.id); s.setCsvPreview([]); s.setCsvMappings([]); }}
          onToggle={(checked) => s.toggleAccount.mutate({ id: s.account!.id, is_active: checked })}
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

      <RenameAccountModal
        account={s.renamingAccount}
        onClose={() => s.setRenamingAccount(null)}
        onRename={(params) => s.renameAccount.mutate(params)}
        onChange={s.setRenamingAccount}
        isPending={s.renameAccount.isPending}
      />

      <CsvUploadModal
        open={!!s.showCsvModal}
        onClose={() => { s.setShowCsvModal(null); s.setCsvPreview([]); s.setCsvMappings([]); }}
        csvPreview={s.csvPreview}
        csvMappings={s.csvMappings}
        onFileChange={s.handleCsvUpload}
        onConfirm={s.handleConfirmCsvUpload}
        isPending={s.uploadMappings.isPending}
      />
    </AppLayout>
  );
};

export default SettingsPage;
