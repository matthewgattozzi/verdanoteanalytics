import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, Trash2, Loader2, Eye, Download, CalendarClock, Send } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useReports, useGenerateReport, useDeleteReport, useAccounts, useSendReportToSlack, useReportSchedules, useUpsertReportSchedule } from "@/hooks/useApi";
import { ReportDetailModal } from "@/components/ReportDetailModal";
import { exportReportCSV } from "@/lib/csv";

const CADENCES = [
  { key: "weekly", label: "Weekly", defaultDays: 7, description: "Runs every Monday" },
  { key: "monthly", label: "Monthly", defaultDays: 30, description: "Runs on the 1st" },
] as const;

const ReportsPage = () => {
  const [showGenerate, setShowGenerate] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [reportName, setReportName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: reports, isLoading } = useReports();
  const { data: accounts } = useAccounts();
  const { data: schedules } = useReportSchedules();
  const generateMut = useGenerateReport();
  const deleteMut = useDeleteReport();
  const slackMut = useSendReportToSlack();
  const upsertScheduleMut = useUpsertReportSchedule();

  const getSchedule = useCallback((accountId: string, cadence: string) => {
    return schedules?.find((s: any) => s.account_id === accountId && s.cadence === cadence);
  }, [schedules]);

  const handleToggleSchedule = (accountId: string, cadence: string, enabled: boolean) => {
    const existing = getSchedule(accountId, cadence);
    upsertScheduleMut.mutate({
      account_id: accountId,
      cadence,
      enabled,
      report_name_template: existing?.report_name_template || `{cadence} Report - {account}`,
      date_range_days: existing?.date_range_days || (cadence === "weekly" ? 7 : 30),
      deliver_to_app: existing?.deliver_to_app ?? true,
      deliver_to_slack: existing?.deliver_to_slack ?? false,
    });
  };

  const handleUpdateSchedule = (accountId: string, cadence: string, field: string, value: any) => {
    const existing = getSchedule(accountId, cadence);
    upsertScheduleMut.mutate({
      account_id: accountId,
      cadence,
      enabled: existing?.enabled ?? true,
      report_name_template: existing?.report_name_template || `{cadence} Report - {account}`,
      date_range_days: existing?.date_range_days || (cadence === "weekly" ? 7 : 30),
      deliver_to_app: existing?.deliver_to_app ?? true,
      deliver_to_slack: existing?.deliver_to_slack ?? false,
      [field]: value,
    });
  };

  // Find previous report for comparison
  const previousReport = useMemo(() => {
    if (!selectedReport || !reports || reports.length < 2) return undefined;
    const sorted = [...reports].sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const currentIdx = sorted.findIndex((r: any) => r.id === selectedReport.id);
    if (currentIdx < 0 || currentIdx >= sorted.length - 1) return undefined;
    for (let i = currentIdx + 1; i < sorted.length; i++) {
      if (sorted[i].account_id === selectedReport.account_id) return sorted[i];
    }
    return undefined;
  }, [selectedReport, reports]);

  const handleGenerate = () => {
    generateMut.mutate(
      { report_name: reportName || `Report ${new Date().toLocaleDateString()}`, account_id: accountId || undefined },
      { onSuccess: () => { setShowGenerate(false); setReportName(""); setAccountId(""); } }
    );
  };

  const fmt = (v: number | null, prefix = "", suffix = "") => {
    if (v === null || v === undefined) return "—";
    return `${prefix}${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Generate and view snapshot reports of your creative performance."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowSchedule(true)}>
              <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
              Schedules
            </Button>
            <Button size="sm" onClick={() => setShowGenerate(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Generate Report
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !reports?.length ? (
        <div className="glass-panel flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No reports yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Generate a snapshot report to capture your current creative performance metrics.
          </p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Report</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Creatives</TableHead>
                <TableHead className="text-xs text-right">Spend</TableHead>
                <TableHead className="text-xs text-right">ROAS</TableHead>
                <TableHead className="text-xs text-right">Win Rate</TableHead>
                <TableHead className="text-xs text-right">CPA</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedReport(r)}>
                  <TableCell>
                    <div className="text-xs font-medium">{r.report_name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.date_range_days ? `${r.date_range_days} days` : "—"}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{r.creative_count}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(r.total_spend, "$")}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(r.blended_roas, "", "x")}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(r.win_rate, "", "%")}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(r.average_cpa, "$")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2" title="Send to Slack" onClick={(e) => { e.stopPropagation(); slackMut.mutate(r.id); }} disabled={slackMut.isPending}>
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); exportReportCSV(r); }}>
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); setSelectedReport(r); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={(e) => { e.stopPropagation(); deleteMut.mutate(r.id); }} disabled={deleteMut.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>Create a new snapshot report of your creative performance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Report Name</Label>
              <Input className="bg-background h-8 text-xs" value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder={`Report ${new Date().toLocaleDateString()}`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account (optional)</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="bg-background h-8 text-xs"><SelectValue placeholder="All accounts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {(accounts || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleGenerate} disabled={generateMut.isPending}>
              {generateMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDetailModal
        report={selectedReport}
        previousReport={previousReport}
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Report Schedules
            </DialogTitle>
            <DialogDescription>Configure automatic report generation per account. Use templates: {"{account}"}, {"{cadence}"}, {"{date}"}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {(accounts || []).map((a: any) => (
              <div key={a.id} className="rounded-lg border bg-card p-3 space-y-3">
                <div className="text-sm font-medium">{a.name}</div>
                {CADENCES.map(({ key, label, defaultDays, description }) => {
                  const schedule = getSchedule(a.id, key);
                  const enabled = schedule?.enabled ?? false;
                  return (
                    <div key={key} className="rounded-md border bg-background p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium">{label}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">{description}</span>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => handleToggleSchedule(a.id, key, checked)}
                        />
                      </div>
                      {enabled && (
                        <div className="space-y-2 pt-1 border-t">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Report Name Template</Label>
                            <Input
                              className="h-7 text-xs bg-card"
                              value={schedule?.report_name_template || `{cadence} Report - {account}`}
                              onChange={(e) => handleUpdateSchedule(a.id, key, "report_name_template", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Date Range (days)</Label>
                            <Input
                              type="number"
                              className="h-7 text-xs bg-card w-24"
                              value={schedule?.date_range_days ?? defaultDays}
                              onChange={(e) => handleUpdateSchedule(a.id, key, "date_range_days", parseInt(e.target.value) || defaultDays)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Delivery</Label>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <Checkbox
                                  checked={schedule?.deliver_to_app ?? true}
                                  onCheckedChange={(checked) => handleUpdateSchedule(a.id, key, "deliver_to_app", !!checked)}
                                />
                                <span className="text-xs">Save in app</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <Checkbox
                                  checked={schedule?.deliver_to_slack ?? false}
                                  onCheckedChange={(checked) => handleUpdateSchedule(a.id, key, "deliver_to_slack", !!checked)}
                                />
                                <span className="text-xs">Send to Slack</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {!(accounts || []).length && (
              <p className="text-xs text-muted-foreground text-center py-4">No accounts found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ReportsPage;
