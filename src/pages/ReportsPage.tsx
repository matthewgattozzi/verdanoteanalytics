import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Download } from "lucide-react";

const ReportsPage = () => {
  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Generate and view snapshot reports of your creative performance."
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Generate Report
          </Button>
        }
      />

      {/* Empty state */}
      <div className="glass-panel flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No reports yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Generate a snapshot report to capture your current creative performance metrics. Reports include top/bottom performers and win rates.
        </p>
      </div>
    </AppLayout>
  );
};

export default ReportsPage;
