import { useCallback, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SortableTableHead, type SortConfig } from "@/components/SortableTableHead";
import { TagSourceBadge } from "@/components/TagSourceBadge";
import { InlineTagSelect } from "@/components/InlineTagSelect";
import { LayoutGrid } from "lucide-react";
import { HEAD_LABELS, NUMERIC_COLS, fmt } from "./constants";

interface CreativesTableProps {
  creatives: any[];
  visibleCols: Set<string>;
  columnOrder: string[];
  sort: SortConfig;
  onSort: (key: string) => void;
  onReorder: (newOrder: string[]) => void;
  onSelect: (creative: any) => void;
}

export function CreativesTable({
  creatives, visibleCols, columnOrder, sort, onSort, onReorder, onSelect,
}: CreativesTableProps) {
  const [dragSourceKey, setDragSourceKey] = useState<string | null>(null);
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);

  const handleColumnDrop = useCallback((targetKey: string) => {
    if (dragSourceKey && dragSourceKey !== targetKey) {
      const newOrder = [...columnOrder];
      const fromIdx = newOrder.indexOf(dragSourceKey);
      const toIdx = newOrder.indexOf(targetKey);
      if (fromIdx !== -1 && toIdx !== -1) {
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, dragSourceKey);
        onReorder(newOrder);
      }
    }
    setDragSourceKey(null);
    setDragTargetKey(null);
  }, [dragSourceKey, columnOrder, onReorder]);

  const renderHead = (key: string) => {
    if (!visibleCols.has(key)) return null;
    if (key === "tags") return <TableHead key={key} className="text-xs">Tags</TableHead>;
    return (
      <SortableTableHead
        key={key}
        label={HEAD_LABELS[key] || key}
        sortKey={key}
        currentSort={sort}
        onSort={onSort}
        className={NUMERIC_COLS.has(key) ? "text-right" : ""}
        draggable
        onDragStart={setDragSourceKey}
        onDragOver={(_e: React.DragEvent, k: string) => setDragTargetKey(k)}
        onDrop={handleColumnDrop}
        isDragTarget={dragTargetKey === key && dragSourceKey !== key}
      />
    );
  };

  const renderCell = (c: any, key: string) => {
    const cellMap: Record<string, () => React.ReactNode> = {
      creative: () => (
        <TableCell key={key}>
          <div className="flex items-center gap-2.5 max-w-[280px]">
            <div className="h-10 w-10 rounded bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
              {c.thumbnail_url ? (
                <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{c.ad_name}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{c.unique_code}</div>
            </div>
          </div>
        </TableCell>
      ),
      ad_status: () => <TableCell key={key} className="text-xs">{c.ad_status || "—"}</TableCell>,
      result_type: () => <TableCell key={key} className="text-xs">{c.result_type || "—"}</TableCell>,
      type: () => <TableCell key={key}><InlineTagSelect adId={c.ad_id} field="ad_type" currentValue={c.ad_type} /></TableCell>,
      person: () => <TableCell key={key}><InlineTagSelect adId={c.ad_id} field="person" currentValue={c.person} /></TableCell>,
      style: () => <TableCell key={key}><InlineTagSelect adId={c.ad_id} field="style" currentValue={c.style} /></TableCell>,
      hook: () => <TableCell key={key}><InlineTagSelect adId={c.ad_id} field="hook" currentValue={c.hook} /></TableCell>,
      product: () => <TableCell key={key} className="text-xs truncate max-w-[120px]">{c.product || "—"}</TableCell>,
      theme: () => <TableCell key={key} className="text-xs truncate max-w-[120px]">{c.theme || "—"}</TableCell>,
      spend: () => <TableCell key={key} className="text-xs text-right">{fmt(c.spend, "$")}</TableCell>,
      roas: () => <TableCell key={key} className="text-xs text-right">{fmt(c.roas, "", "x")}</TableCell>,
      cpa: () => <TableCell key={key} className="text-xs text-right">{fmt(c.cpa, "$")}</TableCell>,
      cpm: () => <TableCell key={key} className="text-xs text-right">{fmt(c.cpm, "$")}</TableCell>,
      cpc: () => <TableCell key={key} className="text-xs text-right">{fmt(c.cpc, "$")}</TableCell>,
      frequency: () => <TableCell key={key} className="text-xs text-right">{fmt(c.frequency, "", "", 1)}</TableCell>,
      cpmr: () => <TableCell key={key} className="text-xs text-right">{fmt(c._cpmr, "$")}</TableCell>,
      ctr: () => <TableCell key={key} className="text-xs text-right">{fmt(c.ctr, "", "%")}</TableCell>,
      impressions: () => <TableCell key={key} className="text-xs text-right">{fmt(c.impressions, "", "", 0)}</TableCell>,
      clicks: () => <TableCell key={key} className="text-xs text-right">{fmt(c.clicks, "", "", 0)}</TableCell>,
      hook_rate: () => <TableCell key={key} className="text-xs text-right">{fmt(c.thumb_stop_rate, "", "%")}</TableCell>,
      hold_rate: () => <TableCell key={key} className="text-xs text-right">{fmt(c.hold_rate, "", "%")}</TableCell>,
      video_views: () => <TableCell key={key} className="text-xs text-right">{fmt(c.video_views, "", "", 0)}</TableCell>,
      video_avg_play_time: () => <TableCell key={key} className="text-xs text-right">{fmt(c.video_avg_play_time, "", "s", 1)}</TableCell>,
      purchases: () => <TableCell key={key} className="text-xs text-right">{fmt(c.purchases, "", "", 0)}</TableCell>,
      purchase_value: () => <TableCell key={key} className="text-xs text-right">{fmt(c.purchase_value, "$")}</TableCell>,
      adds_to_cart: () => <TableCell key={key} className="text-xs text-right">{fmt(c.adds_to_cart, "", "", 0)}</TableCell>,
      cost_per_atc: () => <TableCell key={key} className="text-xs text-right">{fmt(c.cost_per_add_to_cart, "$")}</TableCell>,
      campaign: () => <TableCell key={key} className="text-xs truncate max-w-[150px]">{c.campaign_name || "—"}</TableCell>,
      adset: () => <TableCell key={key} className="text-xs truncate max-w-[150px]">{c.adset_name || "—"}</TableCell>,
      tags: () => <TableCell key={key}><TagSourceBadge source={c.tag_source} /></TableCell>,
    };
    return cellMap[key]?.() ?? null;
  };

  return (
    <div className="glass-panel overflow-hidden animate-fade-in">
      <Table>
        <TableHeader>
          <TableRow>
            {columnOrder.filter(k => visibleCols.has(k)).map(renderHead)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {creatives.map((c: any) => (
            <TableRow key={c.ad_id} className="cursor-pointer hover:bg-accent/50" onClick={() => onSelect(c)}>
              {columnOrder.filter(k => visibleCols.has(k)).map(key => renderCell(c, key))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
