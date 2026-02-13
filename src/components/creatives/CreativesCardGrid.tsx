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
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted-foreground/10 rounded" />}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}

export function CreativesCardGrid({ creatives, onSelect }: CreativesCardGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 animate-fade-in">
      {creatives.map((c: any) => (
        <div key={c.ad_id} className="glass-panel p-3 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onSelect(c)}>
          <div className="bg-muted rounded h-28 mb-2 flex items-center justify-center overflow-hidden relative">
            {c.thumbnail_url ? (
              <CardThumbnail src={c.thumbnail_url} alt={c.ad_name || ""} />
            ) : (
              <LayoutGrid className="h-6 w-6 text-muted-foreground" />
            )}
            {(c.video_views > 0 || (c.video_url && c.video_url !== "no-video")) && (
              <div className="absolute top-1.5 left-1.5 bg-black/60 rounded px-1 py-0.5 flex items-center gap-0.5">
                <Video className="h-3 w-3 text-white" />
                <span className="text-[9px] text-white font-medium">Video</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-muted-foreground">{c.unique_code}</span>
            <TagSourceBadge source={c.tag_source} />
          </div>
          <p className="text-xs font-medium truncate mb-2">{c.ad_name}</p>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div><div className="text-[9px] text-muted-foreground">ROAS</div><div className="text-xs font-mono font-medium">{fmt(c.roas, "", "x")}</div></div>
            <div><div className="text-[9px] text-muted-foreground">CPA</div><div className="text-xs font-mono font-medium">{fmt(c.cpa, "$")}</div></div>
            <div><div className="text-[9px] text-muted-foreground">Spend</div><div className="text-xs font-mono font-medium">{fmt(c.spend, "$")}</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}
