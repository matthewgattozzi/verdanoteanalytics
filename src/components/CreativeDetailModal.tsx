import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TagSourceBadge } from "@/components/TagSourceBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, ExternalLink } from "lucide-react";
import { CreativeMetrics } from "@/components/creative-detail/CreativeMetrics";
import { CreativeTagEditor } from "@/components/creative-detail/CreativeTagEditor";
import { CreativeIterationAnalysis } from "@/components/creative-detail/CreativeIterationAnalysis";
import { CreativeNotes } from "@/components/creative-detail/CreativeNotes";

interface CreativeDetailModalProps {
  creative: any;
  open: boolean;
  onClose: () => void;
}

export function CreativeDetailModal({ creative, open, onClose }: CreativeDetailModalProps) {
  if (!creative) return null;

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
          {creative.thumbnail_url ? (
            <div className="relative w-full">
              <img
                src={creative.thumbnail_url}
                alt={creative.ad_name}
                className="w-full max-h-[400px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {creative.preview_url && (
                <a href={creative.preview_url} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2">
                  <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
                    <ExternalLink className="h-3 w-3" />View Ad Preview
                  </Button>
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs">No preview available</span>
              {creative.preview_url && (
                <a href={creative.preview_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="secondary" className="gap-1.5 text-xs mt-1">
                    <ExternalLink className="h-3 w-3" />View Ad Preview
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>

        <CreativeMetrics creative={creative} />

        {/* Context */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium text-foreground">Ad Name:</span> {creative.ad_name}</p>
          <p><span className="font-medium text-foreground">Campaign:</span> {creative.campaign_name || "—"}</p>
          <p><span className="font-medium text-foreground">Ad Set:</span> {creative.adset_name || "—"}</p>
        </div>

        <Separator />
        <CreativeNotes creative={creative} />
        <Separator />
        <CreativeTagEditor creative={creative} />
        <Separator />
        <CreativeIterationAnalysis creative={creative} />
      </DialogContent>
    </Dialog>
  );
}
