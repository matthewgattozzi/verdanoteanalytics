import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface SyncSettingsSectionProps {
  dateRange: string;
  setDateRange: (v: string) => void;
  roasThreshold: string;
  setRoasThreshold: (v: string) => void;
  spendThreshold: string;
  setSpendThreshold: (v: string) => void;
  onSave: () => void;
  onApplyToAll: () => void;
  saving: boolean;
  showApplyAll: boolean;
}

export function SyncSettingsSection({
  dateRange, setDateRange, roasThreshold, setRoasThreshold,
  spendThreshold, setSpendThreshold, onSave, onApplyToAll, saving, showApplyAll,
}: SyncSettingsSectionProps) {
  return (
    <section className="glass-panel p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold">Sync Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Configure data range and thresholds for this account.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Date Range (days)</Label>
          <Input type="number" value={dateRange} onChange={(e) => setDateRange(e.target.value)} min="1" max="365" className="bg-background" />
          <p className="text-[11px] text-muted-foreground">How many days of data to pull on each sync. This does not affect the date picker filter on the Creatives page.</p>
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
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Save Settings
        </Button>
        {showApplyAll && (
          <Button size="sm" variant="outline" onClick={onApplyToAll} disabled={saving}>
            Apply to All Accounts
          </Button>
        )}
      </div>
    </section>
  );
}
