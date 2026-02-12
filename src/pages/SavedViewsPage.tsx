import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bookmark, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountContext } from "@/contexts/AccountContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ViewConfig {
  page: string;
  account_id?: string;
  analytics_tab?: string;
  slice_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_column?: string;
  sort_direction?: string;
  group_by?: string;
}

interface SavedView {
  id: string;
  name: string;
  description: string | null;
  config: ViewConfig;
  created_at: string;
  updated_at: string;
}

const PAGE_OPTIONS = [
  { value: "/", label: "Creatives" },
  { value: "/analytics", label: "Analytics" },
];

const ANALYTICS_TABS = [
  { value: "trends", label: "Trends" },
  { value: "winrate", label: "Win Rate" },
  { value: "killscale", label: "Kill / Scale" },
  { value: "iterations", label: "Iteration Priorities" },
];

const SLICE_OPTIONS = [
  { value: "ad_type", label: "Type" },
  { value: "person", label: "Person" },
  { value: "style", label: "Style" },
  { value: "hook", label: "Hook" },
  { value: "product", label: "Product" },
  { value: "theme", label: "Theme" },
];

const SavedViewsPage = () => {
  const { user } = useAuth();
  const { accounts, setSelectedAccountId } = useAccountContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [page, setPage] = useState("/");
  const [accountId, setAccountId] = useState("all");
  const [analyticsTab, setAnalyticsTab] = useState("trends");
  const [sliceBy, setSliceBy] = useState("ad_type");
  const [groupBy, setGroupBy] = useState("");

  const { data: views = [], isLoading } = useQuery({
    queryKey: ["saved-views"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_views")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as SavedView[]) || [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const config: ViewConfig = { page };
      if (accountId && accountId !== "all") config.account_id = accountId;
      if (page === "/analytics") {
        config.analytics_tab = analyticsTab;
        if (analyticsTab === "winrate") config.slice_by = sliceBy;
      }
      if (groupBy) config.group_by = groupBy;

      const { error } = await supabase.from("saved_views").insert([{
        user_id: user!.id,
        name,
        description: description || null,
        config: config as any,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views"] });
      toast.success("View saved");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views"] });
      toast.success("View deleted");
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setPage("/");
    setAccountId("all");
    setAnalyticsTab("trends");
    setSliceBy("ad_type");
    setGroupBy("");
  };

  const applyView = (view: SavedView) => {
    const c = view.config;
    if (c.account_id) {
      setSelectedAccountId(c.account_id);
    }
    const params = new URLSearchParams();
    if (c.analytics_tab) params.set("tab", c.analytics_tab);
    if (c.slice_by) params.set("slice", c.slice_by);
    if (c.group_by) params.set("group", c.group_by);
    if (c.date_from) params.set("from", c.date_from);
    if (c.date_to) params.set("to", c.date_to);
    if (c.search) params.set("q", c.search);
    if ((c as any).delivery) params.set("delivery", (c as any).delivery);
    if ((c as any).filters) params.set("filters", JSON.stringify((c as any).filters));
    const qs = params.toString();
    navigate(`${c.page}${qs ? `?${qs}` : ""}`);
  };

  const getPageLabel = (path: string) => PAGE_OPTIONS.find((p) => p.value === path)?.label || path;
  const getAccountName = (id?: string) => {
    if (!id) return "All Accounts";
    return accounts.find((a: any) => a.id === id)?.name || id;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Saved Views"
        description="Save and quickly switch between different analysis configurations."
      />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{views.length} saved view{views.length !== 1 ? "s" : ""}</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New View
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Saved View</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TOF Hook Analysis" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description (optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this view shows" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Page</Label>
                  <Select value={page} onValueChange={setPage}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Accounts</SelectItem>
                      {[...accounts].sort((a: any, b: any) => a.name.localeCompare(b.name)).map((acc: any) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {page === "/analytics" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Analytics Tab</Label>
                    <Select value={analyticsTab} onValueChange={setAnalyticsTab}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ANALYTICS_TABS.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {analyticsTab === "winrate" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Slice By</Label>
                      <Select value={sliceBy} onValueChange={setSliceBy}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SLICE_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              {page === "/" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Group By (optional)</Label>
                  <Select value={groupBy || "none"} onValueChange={(v) => setGroupBy(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      {SLICE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} className="w-full">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save View
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : views.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
          <Bookmark className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">No saved views yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">Create views to quickly jump between different analysis configurations across Creatives and Analytics.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {views.map((view) => (
            <div key={view.id} className="glass-panel p-4 flex items-center justify-between group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Bookmark className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{view.name}</span>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">{getPageLabel(view.config.page)}</Badge>
                  {view.config.account_id && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{getAccountName(view.config.account_id)}</Badge>
                  )}
                  {view.config.analytics_tab && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0 capitalize">{view.config.analytics_tab}</Badge>
                  )}
                  {view.config.slice_by && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">Slice: {view.config.slice_by}</Badge>
                  )}
                  {view.config.group_by && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">Group: {view.config.group_by}</Badge>
                  )}
                </div>
                {view.description && (
                  <p className="text-xs text-muted-foreground ml-5.5 truncate">{view.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 ml-4">
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => applyView(view)}>
                  <ExternalLink className="h-3 w-3" />
                  Open
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteMutation.mutate(view.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default SavedViewsPage;
