import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, Timer, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useSyncHistory, useAccounts, useSyncSchedule, useSync } from "@/hooks/useApi";

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  completed: { label: "Completed", icon: CheckCircle2, className: "text-scale" },
  completed_with_errors: { label: "Partial", icon: AlertTriangle, className: "text-watch" },
  failed: { label: "Failed", icon: XCircle, className: "text-kill" },
  running: { label: "Running", icon: Clock, className: "text-primary" },
};

function NextSyncCountdown() {
  const { data: schedule } = useSyncSchedule();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!schedule || !schedule.enabled || schedule.hour_utc == null) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Timer className="h-3.5 w-3.5" />
        <span>Auto-sync disabled</span>
      </div>
    );
  }

  const hourUtc = Number(schedule.hour_utc);
  const next = new Date(now);
  next.setUTCHours(hourUtc, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

  const diffMs = next.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffM = Math.floor((diffMs % 3_600_000) / 60_000);

  const countdown = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Timer className="h-3.5 w-3.5" />
      <span>Next sync in <span className="font-mono font-medium text-foreground">{countdown}</span></span>
      <span className="text-[10px]">({next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
    </div>
  );
}

const SyncHistoryPage = () => {
  const [accountFilter, setAccountFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: accounts } = useAccounts();
  const { data: logs, isLoading } = useSyncHistory(accountFilter || undefined);
  const syncMut = useSync();

  const getAccountName = (id: string) => {
    const a = (accounts || []).find((a: any) => a.id === id);
    return a?.name || id;
  };

  const fmtDuration = (ms: number | null) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Sync History"
        description="View the history of data syncs from your Meta ad accounts."
        actions={
          <div className="flex items-center gap-3">
            <NextSyncCountdown />
            <Button
              size="sm"
              onClick={() => syncMut.mutate({ account_id: accountFilter || "all" })}
              disabled={syncMut.isPending}
            >
              {syncMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              {syncMut.isPending ? "Syncing…" : "Resync"}
            </Button>
            <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-44 h-8 text-xs bg-background"><SelectValue placeholder="All accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All accounts</SelectItem>
                {(accounts || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !logs?.length ? (
        <div className="glass-panel flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No sync history</h3>
          <p className="text-sm text-muted-foreground max-w-md">Sync logs will appear here after your first data sync.</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Account</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Date Range</TableHead>
                <TableHead className="text-xs text-right">Fetched</TableHead>
                <TableHead className="text-xs text-right">Upserted</TableHead>
                <TableHead className="text-xs text-right">API Calls</TableHead>
                <TableHead className="text-xs text-right">Duration</TableHead>
                <TableHead className="text-xs">Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => {
                const sc = statusConfig[log.status] || statusConfig.running;
                const StatusIcon = sc.icon;
                return (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedLog(log)}>
                    <TableCell className="text-xs font-medium">{getAccountName(log.account_id)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{log.sync_type}</Badge></TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 text-xs ${sc.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {log.date_range_start && log.date_range_end ? `${log.date_range_start} → ${log.date_range_end}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{log.creatives_fetched ?? "—"}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{log.creatives_upserted ?? "—"}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{log.meta_api_calls ?? "—"}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtDuration(log.duration_ms)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(log.started_at).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sync Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Sync Details
                  <Badge variant="outline" className="text-xs">{selectedLog.sync_type}</Badge>
                  {(() => {
                    const sc = statusConfig[selectedLog.status] || statusConfig.running;
                    const StatusIcon = sc.icon;
                    return <span className={`flex items-center gap-1 text-xs ${sc.className}`}><StatusIcon className="h-3 w-3" />{sc.label}</span>;
                  })()}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="glass-panel p-2.5">
                    <div className="metric-label text-[10px]">Account</div>
                    <div className="font-medium mt-0.5">{getAccountName(selectedLog.account_id)}</div>
                  </div>
                  <div className="glass-panel p-2.5">
                    <div className="metric-label text-[10px]">Duration</div>
                    <div className="font-mono font-medium mt-0.5">{fmtDuration(selectedLog.duration_ms)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="glass-panel p-2.5 text-center">
                    <div className="metric-label text-[10px]">Fetched</div>
                    <div className="font-mono font-semibold mt-0.5">{selectedLog.creatives_fetched ?? 0}</div>
                  </div>
                  <div className="glass-panel p-2.5 text-center">
                    <div className="metric-label text-[10px]">Upserted</div>
                    <div className="font-mono font-semibold mt-0.5">{selectedLog.creatives_upserted ?? 0}</div>
                  </div>
                  <div className="glass-panel p-2.5 text-center">
                    <div className="metric-label text-[10px]">API Calls</div>
                    <div className="font-mono font-semibold mt-0.5">{selectedLog.meta_api_calls ?? 0}</div>
                  </div>
                  <div className="glass-panel p-2.5 text-center">
                    <div className="metric-label text-[10px]">Date Range</div>
                    <div className="font-mono font-semibold mt-0.5 text-[10px]">{selectedLog.date_range_start || "—"}</div>
                  </div>
                </div>

                {/* Tag Breakdown */}
                <div>
                  <p className="font-medium mb-1.5">Tag Breakdown</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="glass-panel p-2 text-center">
                      <div className="text-[10px] text-tag-parsed">Parsed</div>
                      <div className="font-mono font-semibold">{selectedLog.tags_parsed ?? 0}</div>
                    </div>
                    <div className="glass-panel p-2 text-center">
                      <div className="text-[10px] text-tag-csv">CSV</div>
                      <div className="font-mono font-semibold">{selectedLog.tags_csv_matched ?? 0}</div>
                    </div>
                    <div className="glass-panel p-2 text-center">
                      <div className="text-[10px] text-tag-manual">Manual</div>
                      <div className="font-mono font-semibold">{selectedLog.tags_manual_preserved ?? 0}</div>
                    </div>
                    <div className="glass-panel p-2 text-center">
                      <div className="text-[10px] text-tag-untagged">Untagged</div>
                      <div className="font-mono font-semibold">{selectedLog.tags_untagged ?? 0}</div>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {(() => {
                  try {
                    const errors = JSON.parse(selectedLog.api_errors || "[]");
                    if (errors.length === 0) return null;
                    return (
                      <div>
                        <p className="font-medium mb-1.5 text-kill">API Errors ({errors.length})</p>
                        <div className="space-y-1">
                          {errors.map((err: any, i: number) => (
                            <div key={i} className="glass-panel p-2 text-[10px]">
                              <span className="text-muted-foreground">{new Date(err.timestamp).toLocaleTimeString()}</span>
                              <span className="ml-2">{err.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}

                <div className="text-[10px] text-muted-foreground">
                  Started: {new Date(selectedLog.started_at).toLocaleString()}
                  {selectedLog.completed_at && <> · Completed: {new Date(selectedLog.completed_at).toLocaleString()}</>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SyncHistoryPage;
