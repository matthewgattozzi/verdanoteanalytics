import { useSettings, useAccounts } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle, X } from "lucide-react";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function OnboardingBanner() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const [dismissed, setDismissed] = useState(false);
  const [manualChecks, setManualChecks] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem("onboarding_checked");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const navigate = useNavigate();

  const toggleManual = useCallback((idx: number) => {
    setManualChecks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      localStorage.setItem("onboarding_checked", JSON.stringify([...next]));
      return next;
    });
  }, []);

  if (settingsLoading || accountsLoading || dismissed) return null;

  const hasToken = settings?.meta_access_token_set === "true";
  const hasAccount = (accounts || []).length > 0;
  const hasTaggedCreatives = (accounts || []).some((a: any) => a.creative_count > 0 && a.untagged_count < a.creative_count);
  const hasGeminiKey = settings?.gemini_api_key_set === "true";

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
  ];

  // Only show Gemini step if not already configured
  if (!hasGeminiKey) {
    steps.push({
      done: false,
      label: "Add AI analysis (optional)",
      description: "Enables AI breakdown of each creative's approach. Not required for tags.",
      action: () => navigate("/settings"),
      optional: true,
    } as any);
  }

  // Check if all steps are done (auto or manual)
  const allDone = steps.every((step, i) => step.done || manualChecks.has(i));
  if (allDone) return null;

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
        {steps.map((step: any, i) => {
          const isDone = step.done || manualChecks.has(i);
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => { if (!step.done) toggleManual(i); }}
                  disabled={step.done}
                  className="h-5 w-5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                    {step.label}
                  </span>
                  {step.optional && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Optional</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!isDone && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={step.action}>
                  {step.optional ? "Configure" : "Set up"}
                </Button>
              )}
            </div>
          );
        })}
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
