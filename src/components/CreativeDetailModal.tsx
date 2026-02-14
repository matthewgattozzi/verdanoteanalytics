import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TagSourceBadge } from "@/components/TagSourceBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, ExternalLink, Play, Video, AlertCircle } from "lucide-react";
import { useState, useRef, useCallback, forwardRef } from "react";
import { CreativeMetrics } from "@/components/creative-detail/CreativeMetrics";
import { CreativeTagEditor } from "@/components/creative-detail/CreativeTagEditor";
import { CreativeIterationAnalysis } from "@/components/creative-detail/CreativeIterationAnalysis";
import { CreativeNotes } from "@/components/creative-detail/CreativeNotes";

interface CreativeDetailModalProps {
  creative: any;
  open: boolean;
  onClose: () => void;
}

function MediaPreview({ creative }: { creative: any }) {
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasVideo = !!creative.video_url && creative.video_url !== "no-video";
  const isVideoAdWithoutSource = creative.video_url === "no-video" && (creative.video_views > 0);
  const facebookAdUrl = creative.preview_url || (creative.ad_id ? `https://www.facebook.com/ads/library/?id=${creative.ad_id}` : null);

  // Video playback with error fallback to iframe/link
  if (hasVideo && showVideo) {
    if (videoError && creative.preview_url) {
      // Fallback: iframe embed of the ad preview
      return (
        <div className="bg-muted rounded-lg overflow-hidden relative">
          <div className="w-full h-[400px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <p className="text-xs">Video couldn't be played directly.</p>
            <a href={creative.preview_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5">
                <Video className="h-4 w-4" />Watch on Facebook
              </Button>
            </a>
            <button onClick={() => { setShowVideo(false); setVideoError(false); }} className="text-xs text-muted-foreground underline mt-1">
              Back to thumbnail
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-muted rounded-lg overflow-hidden relative">
        <video
          src={creative.video_url}
          controls
          autoPlay
          className="w-full max-h-[400px]"
          poster={creative.thumbnail_url || undefined}
          onError={() => setVideoError(true)}
        />
        {creative.preview_url && (
          <a href={creative.preview_url} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2">
            <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
              <ExternalLink className="h-3 w-3" />View Ad Preview
            </Button>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-muted rounded-lg flex items-center justify-center overflow-hidden relative group">
      {creative.thumbnail_url && !imgError ? (
        <div className="relative w-full">
          {/* Skeleton loader */}
          {!imgLoaded && (
            <div className="w-full h-[300px] animate-pulse bg-muted-foreground/10 rounded" />
          )}
          <img
            src={creative.thumbnail_url}
            alt={creative.ad_name}
            className={`w-full max-h-[400px] object-contain transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
          {hasVideo && imgLoaded && (
            <button
              onClick={() => { setShowVideo(true); setVideoError(false); }}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="h-6 w-6 text-foreground ml-0.5" />
              </div>
            </button>
          )}
          {isVideoAdWithoutSource && facebookAdUrl && imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href={facebookAdUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-1.5 shadow-lg">
                  <Video className="h-4 w-4" />Watch on Facebook
                </Button>
              </a>
            </div>
          )}
          {creative.preview_url && imgLoaded && (
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
          {isVideoAdWithoutSource && facebookAdUrl && (
            <a href={facebookAdUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5 text-xs mt-1">
                <Video className="h-4 w-4" />Watch on Facebook
              </Button>
            </a>
          )}
          {!isVideoAdWithoutSource && creative.preview_url && (
            <a href={creative.preview_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="secondary" className="gap-1.5 text-xs mt-1">
                <ExternalLink className="h-3 w-3" />View Ad Preview
              </Button>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export const CreativeDetailModal = forwardRef<HTMLDivElement, CreativeDetailModalProps>(function CreativeDetailModal({ creative, open, onClose }, ref) {
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
        <MediaPreview creative={creative} />

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
});
