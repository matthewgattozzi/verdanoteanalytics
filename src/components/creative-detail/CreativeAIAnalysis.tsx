import { Button } from "@/components/ui/button";
import { useAnalyzeCreative } from "@/hooks/useCreatives";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

interface CreativeAIAnalysisProps {
  creative: any;
}

export function CreativeAIAnalysis({ creative }: CreativeAIAnalysisProps) {
  const analyzeCreative = useAnalyzeCreative();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Analysis</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => analyzeCreative.mutate(creative.ad_id)}
          disabled={analyzeCreative.isPending || creative.analysis_status === "analyzing"}
        >
          {analyzeCreative.isPending || creative.analysis_status === "analyzing" ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Wand2 className="h-3 w-3 mr-1" />
          )}
          {creative.analysis_status === "analyzed" ? "Re-analyze" : "Run Analysis"}
        </Button>
      </div>
      {creative.analysis_status === "analyzed" ? (
        <div className="space-y-3">
          {creative.ai_analysis && (
            <div><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Overview</p><p className="text-xs leading-relaxed">{creative.ai_analysis}</p></div>
          )}
          {creative.ai_hook_analysis && (
            <div><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Hook Execution</p><p className="text-xs leading-relaxed">{creative.ai_hook_analysis}</p></div>
          )}
          {creative.ai_visual_notes && (
            <div><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Visual Notes</p><p className="text-xs leading-relaxed">{creative.ai_visual_notes}</p></div>
          )}
          {creative.ai_cta_notes && (
            <div><p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">CTA Strategy</p><p className="text-xs leading-relaxed">{creative.ai_cta_notes}</p></div>
          )}
          <p className="text-[10px] text-muted-foreground">Analyzed {creative.analyzed_at ? new Date(creative.analyzed_at).toLocaleString() : ""}</p>
        </div>
      ) : creative.analysis_status === "analyzing" ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Analyzing creative...</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Click "Run Analysis" to generate AI-powered insights for this creative.</p>
      )}
    </div>
  );
}
