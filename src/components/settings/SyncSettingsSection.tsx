import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SyncSettingsSectionProps {
  dateRange: string;
  setDateRange: (v: string) => void;
  roasThreshold: string;
  setRoasThreshold: (v: string) => void;
  spendThreshold: string;
  setSpendThreshold: (v: string) => void;
  winnerKpi: string;
  setWinnerKpi: (v: string) => void;
  winnerKpiDirection: string;
  setWinnerKpiDirection: (v: string) => void;
  winnerKpiThreshold: string;
  setWinnerKpiThreshold: (v: string) => void;
  scaleThreshold: string;
  setScaleThreshold: (v: string) => void;
  killThreshold: string;
  setKillThreshold: (v: string) => void;
  onSave: () => void;
  onApplyToAll: () => void;
  saving: boolean;
  showApplyAll: boolean;
}

const KPI_OPTIONS = [
  { value: "roas", label: "ROAS" },
  { value: "cpa", label: "CPA" },
  { value: "ctr", label: "CTR" },
  { value: "thumb_stop_rate", label: "Hook Rate" },
];

const DIRECTION_OPTIONS = [
  { value: "gte", label: "≥ (greater or equal)" },
  { value: "lte", label: "≤ (less or equal)" },
];

export function SyncSettingsSection({
  dateRange, setDateRange, roasThreshold, setRoasThreshold,
  spendThreshold, setSpendThreshold,
  winnerKpi, setWinnerKpi, winnerKpiDirection, setWinnerKpiDirection,
  winnerKpiThreshold, setWinnerKpiThreshold,
  scaleThreshold, setScaleThreshold, killThreshold, setKillThreshold,
  onSave, onApplyToAll, saving, showApplyAll,
}: SyncSettingsSectionProps) {
  const kpiLabel = KPI_OPTIONS.find(k => k.value === winnerKpi)?.label || winnerKpi;
  const isGte = winnerKpiDirection !== "lte";

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
          <p className="text-[11px] text-muted-foreground">How many days of data to pull on each sync.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Iteration Spend Threshold ($)</Label>
          <Input type="number" value={spendThreshold} onChange={(e) => setSpendThreshold(e.target.value)} min="0" className="bg-background" />
          <p className="text-[11px] text-muted-foreground">Minimum spend to include in analysis.</p>
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Winner Definition</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Choose which metric and threshold defines a "winner" creative.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-sm">KPI Metric</Label>
            <Select value={winnerKpi} onValueChange={setWinnerKpi}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KPI_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Direction</Label>
            <Select value={winnerKpiDirection} onValueChange={setWinnerKpiDirection}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIRECTION_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Winner Threshold</Label>
            <Input type="number" value={winnerKpiThreshold} onChange={(e) => setWinnerKpiThreshold(e.target.value)} step="0.1" min="0" className="bg-background" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          A creative is a winner when <span className="font-medium">{kpiLabel}</span> is {isGte ? "≥" : "≤"} <span className="font-medium">{winnerKpiThreshold || "0"}</span> and spend exceeds ${spendThreshold || "0"}.
        </p>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Kill / Scale Zones</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Define {kpiLabel} thresholds for Scale, Watch, and Kill zones. {isGte ? "Scale ≥ top value, Kill < bottom value, Watch = in between." : "Scale ≤ bottom value, Kill > top value, Watch = in between."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm text-scale">Scale Threshold</Label>
            <Input type="number" value={scaleThreshold} onChange={(e) => setScaleThreshold(e.target.value)} step="0.1" min="0" className="bg-background" />
            <p className="text-[11px] text-muted-foreground">
              {isGte ? `${kpiLabel} ≥ this → Scale` : `${kpiLabel} ≤ this → Scale`}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-kill">Kill Threshold</Label>
            <Input type="number" value={killThreshold} onChange={(e) => setKillThreshold(e.target.value)} step="0.1" min="0" className="bg-background" />
            <p className="text-[11px] text-muted-foreground">
              {isGte ? `${kpiLabel} < this → Kill` : `${kpiLabel} > this → Kill`}
            </p>
          </div>
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
