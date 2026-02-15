import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { MetricCardSkeletonRow } from "@/components/skeletons/MetricCardSkeleton";
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";
import { SaveViewButton } from "@/components/SaveViewButton";
import { CreativeDetailModal } from "@/components/CreativeDetailModal";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { TrendsTab } from "@/components/analytics/TrendsTab";
import { WinRateTab } from "@/components/analytics/WinRateTab";
import { ScaleTab } from "@/components/analytics/ScaleTab";
import { KillTab } from "@/components/analytics/KillTab";
import { IterationsTab } from "@/components/analytics/IterationsTab";
import { useAnalyticsPageState } from "@/hooks/useAnalyticsPageState";

const AnalyticsPage = () => {
  const [searchParams] = useSearchParams();
  const defaultSlice = searchParams.get("slice") || "ad_type";
  const {
    activeTab, setActiveTab, selectedCreative, setSelectedCreative,
    dateFrom, dateTo, setDateFrom, setDateTo,
    selectedAccountId, selectedAccount,
    creatives, isLoading, filteredTrendData, trendsLoading,
    roasThreshold, spendThreshold, killScaleConfig,
  } = useAnalyticsPageState();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 rounded-md bg-muted relative overflow-hidden"><div className="absolute inset-0 shimmer-slide" /></div>
          <MetricCardSkeletonRow />
          <ChartSkeleton />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Analytics"
        description="Win rate analysis, scale & kill recommendations, and iteration priorities."
        actions={
          <div className="flex items-center gap-2">
            <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
            <SaveViewButton getConfig={() => ({
              page: "/analytics",
              ...(selectedAccountId && selectedAccountId !== "all" ? { account_id: selectedAccountId } : {}),
              analytics_tab: activeTab,
              ...(dateFrom ? { date_from: dateFrom } : {}),
              ...(dateTo ? { date_to: dateTo } : {}),
            })} />
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="winrate">Win Rate</TabsTrigger>
          <TabsTrigger value="scale">Scale</TabsTrigger>
          <TabsTrigger value="kill">Kill</TabsTrigger>
          <TabsTrigger value="iterations">Iterations</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <TrendsTab trendData={filteredTrendData} isLoading={trendsLoading} />
        </TabsContent>
        <TabsContent value="winrate" className="space-y-4">
          <WinRateTab creatives={creatives} roasThreshold={roasThreshold} spendThreshold={spendThreshold} defaultSlice={defaultSlice} winnerKpi={selectedAccount?.winner_kpi} winnerKpiDirection={selectedAccount?.winner_kpi_direction} winnerKpiThreshold={parseFloat(selectedAccount?.winner_kpi_threshold || "0") || undefined} />
        </TabsContent>
        <TabsContent value="scale" className="space-y-4">
          <ScaleTab creatives={creatives} config={killScaleConfig} onCreativeClick={setSelectedCreative} />
        </TabsContent>
        <TabsContent value="kill" className="space-y-4">
          <KillTab creatives={creatives} config={killScaleConfig} onCreativeClick={setSelectedCreative} />
        </TabsContent>
        <TabsContent value="iterations" className="space-y-4">
          <IterationsTab creatives={creatives} spendThreshold={spendThreshold} onCreativeClick={setSelectedCreative} />
        </TabsContent>
      </Tabs>

      <CreativeDetailModal creative={selectedCreative} open={!!selectedCreative} onClose={() => setSelectedCreative(null)} />
    </AppLayout>
  );
};

export default AnalyticsPage;
