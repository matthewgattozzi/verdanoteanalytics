import { TagSourceBadge } from "@/components/TagSourceBadge";
import { LayoutGrid } from "lucide-react";
import { fmt } from "./constants";

interface CreativesCardGridProps {
  creatives: any[];
  onSelect: (creative: any) => void;
}

export function CreativesCardGrid({ creatives, onSelect }: CreativesCardGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 animate-fade-in">
      {creatives.map((c: any) => (
        <div key={c.ad_id} className="glass-panel p-3 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onSelect(c)}>
          <div className="bg-muted rounded h-28 mb-2 flex items-center justify-center overflow-hidden">
            {c.thumbnail_url ? (
              <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <LayoutGrid className="h-6 w-6 text-muted-foreground" />
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
