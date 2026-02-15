import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AccountProvider } from "@/contexts/AccountContext";
import OverviewPage from "./pages/OverviewPage";
import CreativesPage from "./pages/CreativesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import TaggingPage from "./pages/TaggingPage";
import ReportsPage from "./pages/ReportsPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import PublicReportPage from "./pages/PublicReportPage";
import SettingsPage from "./pages/SettingsPage";
import UserSettingsPage from "./pages/UserSettingsPage";

import SavedViewsPage from "./pages/SavedViewsPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, isLoading, isClient } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <AccountProvider>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/creatives" element={<CreativesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/tagging" element={<TaggingPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/settings" element={isClient ? <Navigate to="/" replace /> : <SettingsPage />} />
        <Route path="/user-settings" element={<UserSettingsPage />} />
        <Route path="/saved-views" element={<SavedViewsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AccountProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/public/reports/:id" element={<PublicReportPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
