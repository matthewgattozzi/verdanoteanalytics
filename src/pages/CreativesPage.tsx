import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { TagSourceBadge } from "@/components/TagSourceBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, LayoutGrid, List, Filter } from "lucide-react";

const CreativesPage = () => {
  return (
    <AppLayout>
      <PageHeader
        title="Creatives"
        description="View and manage your ad creatives with performance data and tags."
        badge={
          <Badge variant="outline" className="bg-tag-untagged/10 text-tag-untagged border-tag-untagged/30 text-xs">
            0 untagged
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filters
            </Button>
            <div className="flex border border-border rounded-md">
              <Button variant="ghost" size="sm" className="rounded-r-none px-2.5 bg-accent">
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-l-none px-2.5">
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Sync
            </Button>
          </div>
        }
      />

      {/* Metric summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Creatives" value="0" />
        <MetricCard label="Avg ROAS" value="—" />
        <MetricCard label="Avg CPA" value="—" />
        <MetricCard label="Avg CTR" value="—" />
      </div>

      {/* Filter pills row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Quick filters:</span>
        <Button variant="outline" size="sm" className="h-7 text-xs">All Ads</Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs">Had Delivery</Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs">Active Ads</Button>
      </div>

      {/* Empty state */}
      <div className="glass-panel flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <LayoutGrid className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No creatives yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Add a Meta ad account in the Accounts tab and sync to pull in your creatives with performance data.
        </p>
      </div>
    </AppLayout>
  );
};

export default CreativesPage;
