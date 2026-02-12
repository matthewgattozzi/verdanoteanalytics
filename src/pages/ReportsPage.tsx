import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
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
import { FileText, Plus, Trash2, Loader2, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { useState } from "react";
import { useReports, useGenerateReport, useDeleteReport, useAccounts } from "@/hooks/useApi";
import { ReportDetailModal } from "@/components/ReportDetailModal";

const ReportsPage = () => {
  const [showGenerate, setShowGenerate] = useState(false);
  const [reportName, setReportName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: reports, isLoading } = useReports();
  const { data: accounts } = useAccounts();
  const generateMut = useGenerateReport();
  const deleteMut = useDeleteReport();

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
          <Button size="sm" onClick={() => setShowGenerate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Generate Report
          </Button>
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

      {/* Report Detail */}
      <ReportDetailModal report={selectedReport} open={!!selectedReport} onClose={() => setSelectedReport(null)} />
    </AppLayout>
  );
};

export default ReportsPage;
