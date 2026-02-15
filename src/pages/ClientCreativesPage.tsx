import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, LayoutGrid, Video, Image as ImageIcon, Play, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useCallback } from "react";
import { useCreatives, CREATIVES_PAGE_SIZE } from "@/hooks/useCreatives";
import { useAccountContext } from "@/contexts/AccountContext";
import { CreativesPagination } from "@/components/creatives/CreativesPagination";
import { MetricCardSkeletonRow } from "@/components/skeletons/MetricCardSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { cn } from "@/lib/utils";

function fmt$(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function trafficLightDot(roas: number, scaleAt: number, killAt: number) {
  if (roas >= scaleAt) return "bg-verdant";
  if (roas < killAt) return "bg-red-500";
  return "bg-gold";
}

function statusLabel(roas: number, scaleAt: number, killAt: number) {
  if (roas >= scaleAt) return { label: "Scaling", cls: "bg-sage-light text-verdant" };
  if (roas < killAt) return { label: "Paused", cls: "bg-red-50 text-red-700" };
  return { label: "Monitoring", cls: "bg-gold-light text-[#92730F]" };
}

const CLIENT_METRICS = [
  { key: "roas", label: "ROAS", fmt: (v: number) => `${v.toFixed(2)}x` },
  { key: "cpa", label: "CPA", fmt: (v: number) => fmt$(v) },
  { key: "spend", label: "Spend", fmt: (v: number) => fmt$(v) },
  { key: "purchases", label: "Purchases", fmt: (v: number) => v.toLocaleString() },
  { key: "ctr", label: "CTR", fmt: (v: number) => `${v.toFixed(2)}%` },
  { key: "thumb_stop_rate", label: "Hook Rate", fmt: (v: number) => `${v.toFixed(2)}%` },
];

const ClientCreativesPage = () => {
  const { selectedAccountId, selectedAccount } = useAccountContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("roas_desc");
  const [page, setPage] = useState(0);
  const [selectedCreative, setSelectedCreative] = useState<any>(null);

  const scaleAt = parseFloat(selectedAccount?.scale_threshold || "2");
  const killAt = parseFloat(selectedAccount?.kill_threshold || "1");
  const spendThreshold = parseFloat(selectedAccount?.iteration_spend_threshold || "50");

  const allFilters = useMemo(() => ({
    ...(selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {}),
    ...(search ? { search } : {}),
  }), [selectedAccountId, search]);

  const { data: creativesResult, isLoading } = useCreatives(allFilters, page);
  const rawCreatives = creativesResult?.data || [];
  const totalCreatives = creativesResult?.total || 0;
  const totalPages = Math.ceil(totalCreatives / CREATIVES_PAGE_SIZE);

  // Filter by spend threshold and status
  const filteredCreatives = useMemo(() => {
    let list = rawCreatives.filter((c: any) => (Number(c.spend) || 0) >= spendThreshold);

    if (statusFilter !== "all") {
      list = list.filter((c: any) => {
        const roas = Number(c.roas) || 0;
        if (statusFilter === "scaling") return roas >= scaleAt;
        if (statusFilter === "watching") return roas >= killAt && roas < scaleAt;
        if (statusFilter === "paused") return roas < killAt;
        return true;
      });
    }

    // Sort
    const [field, dir] = sortBy.split("_");
    const mult = dir === "desc" ? -1 : 1;
    list.sort((a: any, b: any) => {
      if (field === "roas") return ((Number(a.roas) || 0) - (Number(b.roas) || 0)) * mult;
      if (field === "spend") return ((Number(a.spend) || 0) - (Number(b.spend) || 0)) * mult;
      if (field === "created") return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mult;
      return 0;
    });

    return list;
  }, [rawCreatives, statusFilter, sortBy, spendThreshold, scaleAt, killAt]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-[32px] text-forest">Creatives</h1>
          <p className="font-body text-[13px] text-slate font-light mt-1">Your ad creatives and their performance</p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sage" />
            <Input
              placeholder="Search creatives..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="h-8 font-body text-[13px] pl-8 placeholder:text-sage"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36 h-8 font-body text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scaling">Scaling</SelectItem>
              <SelectItem value="watching">Monitoring</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-8 font-body text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roas_desc">Best ROAS</SelectItem>
              <SelectItem value="spend_desc">Most Spend</SelectItem>
              <SelectItem value="created_desc">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <TableSkeleton rows={6} cols={3} />
        ) : filteredCreatives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutGrid className="h-12 w-12 text-sage mb-4" />
            <h3 className="font-heading text-[20px] text-forest mb-1">No creatives to show</h3>
            <p className="font-body text-[14px] text-slate">Check back soon for updated creative performance data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredCreatives.map((c: any) => {
              const roas = Number(c.roas) || 0;
              const spend = Number(c.spend) || 0;
              return (
                <div
                  key={c.ad_id}
                  className="bg-white border border-border-light rounded-[8px] shadow-card hover:shadow-card-hover transition-[box-shadow] duration-150 cursor-pointer"
                  onClick={() => setSelectedCreative(c)}
                >
                  <div className="relative">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt="" className="w-full aspect-video object-cover rounded-t-[6px]" loading="lazy" />
                    ) : (
                      <div className="w-full aspect-video bg-cream-dark rounded-t-[6px] flex items-center justify-center">
                        <LayoutGrid className="h-6 w-6 text-sage" />
                      </div>
                    )}
                    {(c.video_views > 0 || (c.video_url && c.video_url !== "no-video")) && (
                      <div className="absolute top-1.5 left-1.5 bg-charcoal/80 rounded-[3px] px-1.5 py-0.5 flex items-center gap-0.5">
                        <Video className="h-3 w-3 text-white" />
                        <span className="font-label text-[9px] font-semibold uppercase tracking-wide text-white">Video</span>
                      </div>
                    )}
                    {/* Traffic light dot */}
                    <div className={cn("absolute top-2 right-2 h-3 w-3 rounded-full shadow-sm", trafficLightDot(roas, scaleAt, killAt))} />
                  </div>
                  <div className="px-3.5 py-3">
                    <p className="font-body text-[13px] font-semibold text-charcoal truncate mb-2">{c.ad_name}</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-label text-[9px] uppercase text-sage">ROAS</p>
                        <p className={cn("font-data text-[16px] font-semibold tabular-nums", roas >= 2 ? "text-verdant" : roas < 1 ? "text-red-700" : "text-charcoal")}>{roas.toFixed(2)}x</p>
                      </div>
                      <div>
                        <p className="font-label text-[9px] uppercase text-sage">Spend</p>
                        <p className="font-data text-[14px] font-medium text-charcoal tabular-nums">{fmt$(spend)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CreativesPagination page={page} totalPages={totalPages} totalItems={totalCreatives} pageSize={CREATIVES_PAGE_SIZE} onPageChange={setPage} />

        {/* Client Creative Detail Modal */}
        <ClientCreativeDetailModal
          creative={selectedCreative}
          open={!!selectedCreative}
          onClose={() => setSelectedCreative(null)}
          scaleAt={scaleAt}
          killAt={killAt}
        />
      </div>
    </AppLayout>
  );
};

function ClientCreativeDetailModal({ creative, open, onClose, scaleAt, killAt }: { creative: any; open: boolean; onClose: () => void; scaleAt: number; killAt: number }) {
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);

  if (!creative) return null;

  const roas = Number(creative.roas) || 0;
  const hasVideo = !!creative.video_url && creative.video_url !== "no-video";
  const status = statusLabel(roas, scaleAt, killAt);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[8px] shadow-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-body text-[16px] font-semibold text-charcoal">{creative.ad_name}</span>
            <span className={cn("font-label text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-[3px]", status.cls)}>
              {status.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Media */}
        <div className="bg-muted rounded-lg overflow-hidden relative group">
          {hasVideo && showVideo ? (
            videoError ? (
              <div className="w-full h-[350px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <AlertCircle className="h-8 w-8" />
                <p className="text-xs">Video couldn't be played directly.</p>
                {creative.preview_url && (
                  <a href={creative.preview_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-1.5"><Video className="h-4 w-4" />Watch on Facebook</Button>
                  </a>
                )}
                <button onClick={() => { setShowVideo(false); setVideoError(false); }} className="text-xs text-muted-foreground underline mt-1">Back to thumbnail</button>
              </div>
            ) : (
              <video src={creative.video_url} controls autoPlay className="w-full max-h-[400px]" poster={creative.thumbnail_url} onError={() => setVideoError(true)} />
            )
          ) : creative.thumbnail_url ? (
            <div className="relative w-full">
              <img src={creative.thumbnail_url} alt="" className="w-full max-h-[400px] object-contain" />
              {hasVideo && (
                <button onClick={() => { setShowVideo(true); setVideoError(false); }} className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 cursor-pointer">
                  <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="h-6 w-6 text-foreground ml-0.5" />
                  </div>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-12">
              <ImageIcon className="h-8 w-8 text-sage" />
              <span className="font-body text-[13px] text-sage">No preview available</span>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div>
          <p className="font-label text-[10px] font-semibold uppercase tracking-[0.08em] text-slate mb-2 pb-1.5 border-b border-border-light">
            Performance
          </p>
          <div className="grid grid-cols-3 gap-px bg-border-light">
            {CLIENT_METRICS.map((m) => {
              const val = Number(creative[m.key]) || 0;
              return (
                <div key={m.key} className="bg-white py-3 px-2.5 text-center">
                  <div className="font-label text-[9px] uppercase tracking-[0.06em] text-sage">{m.label}</div>
                  <div className={cn("font-data text-[16px] font-semibold mt-0.5 tabular-nums", m.key === "roas" ? (val >= 2 ? "text-verdant" : val < 1 ? "text-red-700" : "text-charcoal") : "text-charcoal")}>
                    {m.fmt(val)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ClientCreativesPage;
