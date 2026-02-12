import { useSettings, useAccounts } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function OnboardingBanner() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (settingsLoading || accountsLoading || dismissed) return null;

  const hasToken = settings?.meta_access_token_set === "true";
  const hasAccount = (accounts || []).length > 0;
  const hasTaggedCreatives = (accounts || []).some((a: any) => a.creative_count > 0 && a.untagged_count < a.creative_count);
  const hasGeminiKey = settings?.gemini_api_key_set === "true";

  // Auto-hide if fully set up
  if (hasToken && hasAccount && hasTaggedCreatives) return null;

  const steps = [
    {
      done: hasToken,
      label: "Add Meta access token",
      description: "Save & Connect in Settings",
      action: () => navigate("/settings"),
    },
    {
      done: hasAccount,
      label: "Add an ad account",
      description: "Select from connected accounts",
      action: () => navigate("/accounts"),
    },
    {
      done: hasTaggedCreatives,
      label: "Tag your creatives",
      description: "Ads following the naming convention are tagged automatically. Otherwise, upload a CSV mapping.",
      action: () => navigate("/accounts"),
    },
    {
      done: hasGeminiKey,
      label: "Add AI analysis (optional)",
      description: "Enables AI breakdown of each creative's approach. Not required for tags.",
      action: () => navigate("/settings"),
      optional: true,
    },
  ];

  return (
    <div className="glass-panel p-5 mb-6 animate-fade-in relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <h2 className="text-sm font-semibold mb-1">Get started with Creative Analytics</h2>
      <p className="text-xs text-muted-foreground mb-4">Complete these steps to start analyzing your Meta ad creatives.</p>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}>
                  {step.label}
                </span>
                {step.optional && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Optional</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {!step.done && (
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={step.action}>
                {step.optional ? "Configure" : "Set up"}
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-muted/50 rounded-md">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Naming convention:</span>{" "}
          <span className="font-mono">{"{UniqueCode}_{Type}_{Person}_{Style}_{Product}_{Hook}_{Theme}"}</span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Example: <span className="font-mono">GS145474_Video_Creator_UGCNative_Greens_StatementBold_ChronicFatigue</span>
        </p>
      </div>
    </div>
  );
}
