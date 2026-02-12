import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, Sparkles } from "lucide-react";
import { useState } from "react";

const SettingsPage = () => {
  const [showToken, setShowToken] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Configure your Meta connection, sync preferences, and optional integrations."
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
              <XCircle className="h-3 w-3 text-destructive" />
              Not Connected
            </Badge>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? "text" : "password"}
                placeholder="Enter your Meta access token..."
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
            <Button>Save & Connect</Button>
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
              <Input
                id="dateRange"
                type="number"
                defaultValue="30"
                min="1"
                max="365"
                className="bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                How many days of data to pull on each sync.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roasThreshold" className="text-sm">Winner ROAS Threshold</Label>
              <Input
                id="roasThreshold"
                type="number"
                defaultValue="2.0"
                step="0.1"
                min="0"
                className="bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Minimum ROAS to consider a creative a "winner" (BOF).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="spendThreshold" className="text-sm">Iteration Spend Threshold ($)</Label>
              <Input
                id="spendThreshold"
                type="number"
                defaultValue="50"
                min="0"
                className="bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Minimum spend to include a creative in iteration analysis.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button size="sm">Save Settings</Button>
          </div>
        </section>

        {/* Gemini API Key */}
        <section className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-base font-semibold">AI Creative Analysis</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Optional. Enables AI-powered creative breakdown — what's happening in each ad and why it may be performing. Does NOT affect tags.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              Not Configured
            </Badge>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showGeminiKey ? "text" : "password"}
                placeholder="Enter your Gemini API key..."
                className="pr-10 bg-background"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button variant="outline">Save Key</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            AI analysis uses Lovable AI to generate qualitative breakdowns of your creatives — hook execution, visual approach, CTA strategy, and more.
          </p>
        </section>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
