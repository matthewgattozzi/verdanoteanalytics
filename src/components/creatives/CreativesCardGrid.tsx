import { TagSourceBadge } from "@/components/TagSourceBadge";
import { LayoutGrid, Video } from "lucide-react";
import { useState } from "react";
import { fmt } from "./constants";

interface CreativesCardGridProps {
  creatives: any[];
  onSelect: (creative: any) => void;
}

function CardThumbnail({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error || !src) {
    return <LayoutGrid className="h-6 w-6 text-muted-foreground" />;
  }

  return (
    <>
      {!loaded && <div className="absolute inset-0 bg-cream-dark rounded" />}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}

function roasColor(roas: number | null | undefined): string {
  if (roas == null) return "text-charcoal";
  if (roas >= 2) return "text-verdant";
  if (roas < 1) return "text-red-700";
  return "text-charcoal";
}

export function CreativesCardGrid({ creatives, onSelect }: CreativesCardGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {creatives.map((c: any) => (
        <div
          key={c.ad_id}
          className="bg-white border border-border-light rounded-card shadow-card cursor-pointer transition-[box-shadow] duration-150 ease hover:shadow-card-hover"
          onClick={() => onSelect(c)}
        >
          {/* Thumbnail */}
          <div className="bg-muted rounded-t-card h-28 flex items-center justify-center overflow-hidden relative">
            {c.thumbnail_url ? (
              <CardThumbnail src={c.thumbnail_url} alt={c.ad_name || ""} />
            ) : (
              <LayoutGrid className="h-6 w-6 text-muted-foreground" />
            )}
            {(c.video_views > 0 || (c.video_url && c.video_url !== "no-video")) && (
              <div className="absolute top-1.5 left-1.5 bg-charcoal/80 rounded-[3px] px-1.5 py-0.5 flex items-center gap-0.5">
                <Video className="h-3 w-3 text-white" />
                <span className="font-label text-[9px] font-semibold uppercase tracking-wide text-white">Video</span>
              </div>
            )}
          </div>

          {/* Name & code area */}
          <div className="px-3 pt-2.5 pb-2">
            <div className="flex items-center justify-between mb-0.5">
              <p className="font-body text-[12px] font-medium text-charcoal truncate flex-1 min-w-0 mr-2">{c.ad_name}</p>
              <TagSourceBadge source={c.tag_source} />
            </div>
            <p className="font-body text-[11px] font-normal text-sage truncate mt-0.5">{c.unique_code}</p>
          </div>

          {/* Metrics row */}
          <div className="border-t border-border-light grid grid-cols-3 gap-1 text-center py-2 px-3">
            <div>
              <div className="font-label text-[9px] uppercase tracking-[0.06em] text-sage font-medium">ROAS</div>
              <div className={`font-data text-[14px] font-semibold tabular-nums ${roasColor(c.roas)}`}>{fmt(c.roas, "", "x")}</div>
            </div>
            <div>
              <div className="font-label text-[9px] uppercase tracking-[0.06em] text-sage font-medium">CPA</div>
              <div className="font-data text-[14px] font-semibold text-charcoal tabular-nums">{fmt(c.cpa, "$")}</div>
            </div>
            <div>
              <div className="font-label text-[9px] uppercase tracking-[0.06em] text-sage font-medium">Spend</div>
              <div className="font-data text-[14px] font-semibold text-charcoal tabular-nums">{fmt(c.spend, "$")}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
