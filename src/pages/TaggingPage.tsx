import { useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagSourceBadge } from "@/components/TagSourceBadge";
import { CsvUploadModal } from "@/components/settings/CsvUploadModal";
import { useAccountContext } from "@/contexts/AccountContext";
import { useCreatives, useUpdateCreative, CREATIVES_PAGE_SIZE } from "@/hooks/useCreatives";
import { useUploadMappings } from "@/hooks/useAccountsApi";
import { TAG_OPTIONS_MAP } from "@/lib/tagOptions";
import { toast } from "sonner";
import {
  Search, ChevronLeft, ChevronRight, Filter, Upload, LayoutGrid, Loader2, Save, X,
} from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const TAG_FIELDS = ["ad_type", "person", "style", "hook", "product", "theme"] as const;
const TAG_LABELS: Record<string, string> = {
  ad_type: "Type", person: "Person", style: "Style",
  hook: "Hook", product: "Product", theme: "Theme",
};

function EditableTagCell({
  adId, field, value, onLocalChange,
}: {
  adId: string; field: string; value: string; onLocalChange: (adId: string, field: string, val: string) => void;
}) {
  const options = TAG_OPTIONS_MAP[field];

  if (options) {
    return (
      <Select value={value || ""} onValueChange={(v) => onLocalChange(adId, field, v)}>
        <SelectTrigger className="h-7 text-xs border-border/50 bg-background w-full">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__clear__" className="text-xs text-muted-foreground italic">Clear</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      className="h-7 text-xs bg-background"
      value={value}
      onChange={(e) => onLocalChange(adId, field, e.target.value)}
      placeholder="—"
    />
  );
}

const TaggingPage = () => {
  const { selectedAccountId, accounts } = useAccountContext();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("untagged");
  const [activeTab, setActiveTab] = useState("manual");

  // CSV state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvMappings, setCsvMappings] = useState<any[]>([]);
  const uploadMappings = useUploadMappings();

  // Build filters
  const filters: Record<string, string> = {};
  if (selectedAccountId && selectedAccountId !== "all") filters.account_id = selectedAccountId;
  if (search) filters.search = search;
  if (tagFilter && tagFilter !== "all") filters.tag_source = tagFilter;

  const { data, isLoading } = useCreatives(filters, page);
  const creatives = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / CREATIVES_PAGE_SIZE);
  const updateCreative = useUpdateCreative();

  // Local edits tracking: { [adId]: { field: value } }
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const dirtyIds = Object.keys(localEdits);

  const handleLocalChange = useCallback((adId: string, field: string, val: string) => {
    setLocalEdits((prev) => ({
      ...prev,
      [adId]: { ...(prev[adId] || {}), [field]: val === "__clear__" ? "" : val },
    }));
  }, []);

  const handleSaveAll = useCallback(() => {
    const entries = Object.entries(localEdits);
    if (entries.length === 0) return;
    entries.forEach(([adId, updates]) => {
      updateCreative.mutate({ adId, updates: { ...updates, tag_source: "manual" } });
    });
    setLocalEdits({});
  }, [localEdits, updateCreative]);

  const handleDiscardAll = useCallback(() => {
    setLocalEdits({});
  }, []);

  const getFieldValue = (c: any, field: string) => {
    if (localEdits[c.ad_id]?.[field] !== undefined) return localEdits[c.ad_id][field];
    return c[field] || "";
  };

  // CSV handlers
  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast.error("Invalid CSV — must have headers and at least one row."); return; }
      const headers = lines[0].split(",").map((h) => h.trim());
      const required = ["UniqueCode", "Type", "Person", "Style", "Product", "Hook", "Theme"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) { toast.error(`Missing columns: ${missing.join(", ")}`); return; }
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });
      setCsvPreview(rows.slice(0, 5));
      setCsvMappings(rows);
    };
    reader.readAsText(file);
  }, []);

  const handleConfirmCsvUpload = useCallback(async () => {
    if (!selectedAccountId || selectedAccountId === "all") {
      toast.error("Select a specific account first.");
      return;
    }
    if (csvMappings.length === 0) return;
    await uploadMappings.mutateAsync({ accountId: selectedAccountId, mappings: csvMappings });
    setShowCsvModal(false);
    setCsvPreview([]);
    setCsvMappings([]);
  }, [selectedAccountId, csvMappings, uploadMappings]);

  const currentAccount = accounts.find((a: any) => a.id === selectedAccountId);

  return (
    <AppLayout>
      <PageHeader
        title="Tagging"
        description="Label your ads manually or upload a CSV of name mappings."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="manual">Manual Tagging</TabsTrigger>
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
          </TabsList>

          {activeTab === "manual" && dirtyIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{dirtyIds.length} unsaved</Badge>
              <Button size="sm" variant="outline" onClick={handleDiscardAll}>
                <X className="h-3 w-3 mr-1" /> Discard
              </Button>
              <Button size="sm" onClick={handleSaveAll} disabled={updateCreative.isPending}>
                {updateCreative.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save All
              </Button>
            </div>
          )}
        </div>

        {/* ── Manual Tagging Tab ── */}
        <TabsContent value="manual" className="space-y-4">
          {/* Filters row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs bg-background"
                placeholder="Search ads..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(0); }}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Tags</SelectItem>
                <SelectItem value="untagged" className="text-xs">Untagged</SelectItem>
                <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                <SelectItem value="csv_match" className="text-xs">CSV Match</SelectItem>
                <SelectItem value="parsed" className="text-xs">Parsed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{total} creatives</span>
          </div>

          {/* Table */}
          {isLoading ? (
            <TableSkeleton rows={8} cols={8} />
          ) : (
          <div className="border border-border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[250px]">Creative</TableHead>
                  <TableHead className="text-xs w-[80px]">Status</TableHead>
                  {TAG_FIELDS.map((f) => (
                    <TableHead key={f} className="text-xs min-w-[120px]">{TAG_LABELS[f]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? null : creatives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                      No creatives found
                    </TableCell>
                  </TableRow>
                ) : (
                  creatives.map((c: any) => (
                    <TableRow
                      key={c.ad_id}
                      className={localEdits[c.ad_id] ? "bg-primary/5" : "even:bg-muted/30"}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-[250px]">
                          <div className="h-8 w-8 rounded bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {c.thumbnail_url ? (
                              <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <LayoutGrid className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">{c.ad_name}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{c.unique_code || "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TagSourceBadge source={c.tag_source} />
                      </TableCell>
                      {TAG_FIELDS.map((field) => (
                        <TableCell key={field} className="p-1.5">
                          <EditableTagCell
                            adId={c.ad_id}
                            field={field}
                            value={getFieldValue(c, field)}
                            onLocalChange={handleLocalChange}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── CSV Upload Tab ── */}
        <TabsContent value="csv" className="space-y-4">
          <div className="max-w-2xl space-y-4">
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-sm font-semibold">Upload Name Mappings</h3>
              <p className="text-xs text-muted-foreground">
                Upload a CSV file with columns: <span className="font-mono text-foreground">UniqueCode, Type, Person, Style, Product, Hook, Theme</span>.
                Each row maps a unique code to its tag values. Matching creatives will be updated automatically.
              </p>

              {selectedAccountId === "all" ? (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-4 text-center">
                  Select a specific account from the sidebar to upload mappings.
                </div>
              ) : (
                <>
                  <Button onClick={() => setShowCsvModal(true)} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload CSV
                  </Button>
                  {currentAccount && (
                    <p className="text-xs text-muted-foreground">
                      Uploading to: <span className="font-medium text-foreground">{currentAccount.name}</span>
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="glass-panel p-6 space-y-3">
              <h3 className="text-sm font-semibold">CSV Format</h3>
              <div className="bg-muted/50 rounded-md p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
                UniqueCode,Type,Person,Style,Product,Hook,Theme<br />
                ABC001,Video,Creator,UGC Native,Serum,Problem Callout,Anti-aging<br />
                ABC002,Static,Founder,Studio Clean,Moisturizer,Authority Intro,Hydration
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CsvUploadModal
        open={showCsvModal}
        onClose={() => { setShowCsvModal(false); setCsvPreview([]); setCsvMappings([]); }}
        csvPreview={csvPreview}
        csvMappings={csvMappings}
        onFileChange={handleCsvUpload}
        onConfirm={handleConfirmCsvUpload}
        isPending={uploadMappings.isPending}
      />
    </AppLayout>
  );
};

export default TaggingPage;
