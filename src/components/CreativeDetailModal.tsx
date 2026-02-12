import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagSourceBadge } from "@/components/TagSourceBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUpdateCreative, useAnalyzeCreative } from "@/hooks/useCreatives";
import { useState, useEffect } from "react";
import { Loader2, RotateCcw, Save, Image as ImageIcon, Sparkles, Wand2, Maximize, Minimize } from "lucide-react";
import { useRef, useCallback } from "react";

const TYPE_OPTIONS = ["Video", "Static", "GIF", "Carousel"];
const PERSON_OPTIONS = ["Creator", "Customer", "Founder", "Actor", "No Talent"];
const STYLE_OPTIONS = ["UGC Native", "Studio Clean", "Text Forward", "Lifestyle"];
const HOOK_OPTIONS = ["Problem Callout", "Confession", "Question", "Statement Bold", "Authority Intro", "Before & After", "Pattern Interrupt"];

interface CreativeDetailModalProps {
  creative: any;
  open: boolean;
  onClose: () => void;
}

export function CreativeDetailModal({ creative, open, onClose }: CreativeDetailModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const updateCreative = useUpdateCreative();
  const analyzeCreative = useAnalyzeCreative();

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!document.fullscreenElement) {
      video.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);
  const [tags, setTags] = useState({
    ad_type: "",
    person: "",
    style: "",
    product: "",
    hook: "",
    theme: "",
  });

  useEffect(() => {
    if (creative) {
      setTags({
        ad_type: creative.ad_type || "",
        person: creative.person || "",
        style: creative.style || "",
        product: creative.product || "",
        hook: creative.hook || "",
        theme: creative.theme || "",
      });
    }
  }, [creative]);

  if (!creative) return null;

  const handleSave = () => {
    updateCreative.mutate({ adId: creative.ad_id, updates: tags });
  };

  const handleResetToAuto = () => {
    updateCreative.mutate({ adId: creative.ad_id, updates: { tag_source: "untagged" } });
  };

  const fmt = (v: number | null, prefix = "", suffix = "") => {
    if (v === null || v === undefined || v === 0) return "—";
    return `${prefix}${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
  };

  const metrics = [
    { label: "Spend", value: fmt(creative.spend, "$") },
    { label: "ROAS", value: fmt(creative.roas, "", "x") },
    { label: "CPA", value: fmt(creative.cpa, "$") },
    { label: "CTR", value: fmt(creative.ctr, "", "%") },
    { label: "CPM", value: fmt(creative.cpm, "$") },
    { label: "Purchases", value: creative.purchases || "—" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{creative.unique_code}</span>
            <TagSourceBadge source={creative.tag_source} />
            <Badge variant="outline" className="text-xs">{creative.ad_status}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Media preview */}
        <div className="bg-muted rounded-lg flex items-center justify-center overflow-hidden relative group">
          {creative.preview_url ? (
            <>
              <video
                ref={videoRef}
                src={creative.preview_url}
                controls
                poster={creative.thumbnail_url || undefined}
                className="w-full max-h-[400px] object-contain rounded-lg"
                preload="metadata"
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              </Button>
            </>
          ) : creative.thumbnail_url ? (
            <img
              src={creative.thumbnail_url}
              alt={creative.ad_name}
              className="w-full max-h-[400px] object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs">No preview available</span>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-6 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="glass-panel p-2.5 text-center">
              <div className="metric-label text-[10px]">{m.label}</div>
              <div className="text-sm font-semibold font-mono mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Context */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium text-foreground">Ad Name:</span> {creative.ad_name}</p>
          <p><span className="font-medium text-foreground">Campaign:</span> {creative.campaign_name || "—"}</p>
          <p><span className="font-medium text-foreground">Ad Set:</span> {creative.adset_name || "—"}</p>
        </div>

        <Separator />

        {/* Editable Tags */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Tags</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleResetToAuto} disabled={updateCreative.isPending}>
                <RotateCcw className="h-3 w-3 mr-1" />Reset to Auto
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateCreative.isPending}>
                {updateCreative.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save Tags
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={tags.ad_type} onValueChange={(v) => setTags({ ...tags, ad_type: v })}>
                <SelectTrigger className="bg-background h-8 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Person</Label>
              <Select value={tags.person} onValueChange={(v) => setTags({ ...tags, person: v })}>
                <SelectTrigger className="bg-background h-8 text-xs"><SelectValue placeholder="Select person" /></SelectTrigger>
                <SelectContent>{PERSON_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Style</Label>
              <Select value={tags.style} onValueChange={(v) => setTags({ ...tags, style: v })}>
                <SelectTrigger className="bg-background h-8 text-xs"><SelectValue placeholder="Select style" /></SelectTrigger>
                <SelectContent>{STYLE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hook</Label>
              <Select value={tags.hook} onValueChange={(v) => setTags({ ...tags, hook: v })}>
                <SelectTrigger className="bg-background h-8 text-xs"><SelectValue placeholder="Select hook" /></SelectTrigger>
                <SelectContent>{HOOK_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Product</Label>
              <Input className="bg-background h-8 text-xs" value={tags.product} onChange={(e) => setTags({ ...tags, product: e.target.value })} placeholder="Product name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Theme</Label>
              <Input className="bg-background h-8 text-xs" value={tags.theme} onChange={(e) => setTags({ ...tags, theme: e.target.value })} placeholder="Theme / angle" />
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <Separator />
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
      </DialogContent>
    </Dialog>
  );
}
