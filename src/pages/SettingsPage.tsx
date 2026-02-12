import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useSettings, useSaveSettings, useTestMeta } from "@/hooks/useApi";
import { toast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const [showToken, setShowToken] = useState(false);
  const [metaToken, setMetaToken] = useState("");
  const [dateRange, setDateRange] = useState("30");
  const [roasThreshold, setRoasThreshold] = useState("2.0");
  const [spendThreshold, setSpendThreshold] = useState("50");
  const [metaStatus, setMetaStatus] = useState<"unknown" | "connected" | "disconnected" | "testing">("unknown");
  const [metaUser, setMetaUser] = useState<string | null>(null);

  const { data: settings, isLoading } = useSettings();
  const saveSettings = useSaveSettings();
  const testMeta = useTestMeta();

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
        description="Configure your Meta connection and sync preferences."
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
    </AppLayout>
  );
};

export default SettingsPage;
