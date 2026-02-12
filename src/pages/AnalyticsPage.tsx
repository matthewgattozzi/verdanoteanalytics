import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import { SaveViewButton } from "@/components/SaveViewButton";
import { CreativeDetailModal } from "@/components/CreativeDetailModal";
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAllCreatives } from "@/hooks/useAllCreatives";
import { useDailyTrends } from "@/hooks/useDailyTrends";
import { useAccountContext } from "@/contexts/AccountContext";
import { AIInsightsTab } from "@/components/AIInsightsTab";
import { TrendsTab } from "@/components/analytics/TrendsTab";
import { WinRateTab } from "@/components/analytics/WinRateTab";
import { KillScaleTab } from "@/components/analytics/KillScaleTab";
import { IterationsTab } from "@/components/analytics/IterationsTab";

const AnalyticsPage = () => {
  const { selectedAccountId, selectedAccount } = useAccountContext();
  const [searchParams] = useSearchParams();
  const accountFilter = selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {};
  const { data: creatives = [], isLoading } = useAllCreatives(accountFilter);
  const { data: trendData, isLoading: trendsLoading } = useDailyTrends(selectedAccountId || undefined);
  const defaultTab = searchParams.get("tab") || "trends";
  const defaultSlice = searchParams.get("slice") || "ad_type";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedCreative, setSelectedCreative] = useState<any>(null);

  const roasThreshold = parseFloat(selectedAccount?.winner_roas_threshold || "2.0");
  const spendThreshold = parseFloat(selectedAccount?.iteration_spend_threshold || "50");

  const untaggedCount = useMemo(() => creatives.filter((c: any) => c.tag_source === "untagged").length, [creatives]);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <PageHeader
        title="Analytics"
        description="Win rate analysis, kill/scale recommendations, and iteration priorities."
        badge={untaggedCount > 0 ? (
          <Badge variant="outline" className="text-xs text-muted-foreground">{untaggedCount} untagged</Badge>
        ) : undefined}
        actions={
          <SaveViewButton getConfig={() => ({
            page: "/analytics",
            ...(selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {}),
            analytics_tab: activeTab,
          })} />
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="winrate">Win Rate</TabsTrigger>
          <TabsTrigger value="killscale">Kill / Scale</TabsTrigger>
          <TabsTrigger value="iterations">Iteration Priorities</TabsTrigger>
          <TabsTrigger value="ai-insights" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="animate-fade-in space-y-4">
          <TrendsTab trendData={trendData} isLoading={trendsLoading} />
        </TabsContent>

        <TabsContent value="winrate" className="animate-fade-in space-y-4">
          <WinRateTab creatives={creatives} roasThreshold={roasThreshold} spendThreshold={spendThreshold} defaultSlice={defaultSlice} />
        </TabsContent>

        <TabsContent value="killscale" className="animate-fade-in space-y-4">
          <KillScaleTab creatives={creatives} roasThreshold={roasThreshold} spendThreshold={spendThreshold} onCreativeClick={setSelectedCreative} />
        </TabsContent>

        <TabsContent value="iterations" className="animate-fade-in space-y-4">
          <IterationsTab creatives={creatives} spendThreshold={spendThreshold} />
        </TabsContent>

        <TabsContent value="ai-insights" className="animate-fade-in">
          <AIInsightsTab />
        </TabsContent>
      </Tabs>

      <CreativeDetailModal creative={selectedCreative} open={!!selectedCreative} onClose={() => setSelectedCreative(null)} />
    </AppLayout>
  );
};

export default AnalyticsPage;
