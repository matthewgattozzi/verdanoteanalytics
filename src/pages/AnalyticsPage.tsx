import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { BarChart3, TrendingUp, TrendingDown, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AnalyticsPage = () => {
  return (
    <AppLayout>
      <PageHeader
        title="Analytics"
        description="Win rate analysis, kill/scale recommendations, and iteration priorities."
      />

      <Tabs defaultValue="winrate" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="winrate">Win Rate</TabsTrigger>
          <TabsTrigger value="killscale">Kill / Scale</TabsTrigger>
          <TabsTrigger value="iterations">Iteration Priorities</TabsTrigger>
        </TabsList>

        <TabsContent value="winrate" className="animate-fade-in">
          <div className="grid grid-cols-4 gap-3 mb-6">
            <MetricCard label="Total Creatives" value="0" icon={<BarChart3 className="h-4 w-4" />} />
            <MetricCard label="Winners" value="0" icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="Win Rate" value="—" icon={<Target className="h-4 w-4" />} />
            <MetricCard label="Blended ROAS" value="—" />
          </div>

          <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">No data yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Sync your creatives and ensure they are tagged to see win rate analysis by tag dimensions.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="killscale" className="animate-fade-in">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-panel p-4 border-l-2 border-l-scale">
              <div className="metric-label text-scale mb-2">Scale</div>
              <div className="metric-value">0</div>
              <p className="text-xs text-muted-foreground mt-1">High performers to increase spend on</p>
            </div>
            <div className="glass-panel p-4 border-l-2 border-l-watch">
              <div className="metric-label text-watch mb-2">Watch</div>
              <div className="metric-value">0</div>
              <p className="text-xs text-muted-foreground mt-1">Mixed signals or insufficient data</p>
            </div>
            <div className="glass-panel p-4 border-l-2 border-l-kill">
              <div className="metric-label text-kill mb-2">Kill</div>
              <div className="metric-value">0</div>
              <p className="text-xs text-muted-foreground mt-1">Underperformers to turn off</p>
            </div>
          </div>

          <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
            <TrendingDown className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">No recommendations yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Sync creatives with enough spend data to generate kill/scale recommendations.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="iterations" className="animate-fade-in">
          <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">No iteration priorities yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Once you have tagged creatives with performance data, iteration priorities will surface opportunities to test new variations.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default AnalyticsPage;
