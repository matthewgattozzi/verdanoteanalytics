import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Upload, AlertTriangle } from "lucide-react";

const AccountsPage = () => {
  return (
    <AppLayout>
      <PageHeader
        title="Accounts"
        description="Manage your connected Meta ad accounts."
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Account
          </Button>
        }
      />

      {/* Empty state */}
      <div className="glass-panel flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No accounts connected</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          Connect your Meta access token in Settings first, then add ad accounts here.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href="/settings">Go to Settings</a>
        </Button>
      </div>
    </AppLayout>
  );
};

export default AccountsPage;
