import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface MetaConnectionSectionProps {
  metaStatus: "unknown" | "connected" | "disconnected" | "testing";
  metaUser: string | null;
  onTestConnection: () => void;
}

export function MetaConnectionSection({ metaStatus, metaUser, onTestConnection }: MetaConnectionSectionProps) {
  return (
    <section className="glass-panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Meta Connection</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Token is managed securely. Test your connection below.</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          {metaStatus === "testing" ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Testing</>
          ) : metaStatus === "connected" ? (
            <><CheckCircle2 className="h-3 w-3 text-success" /> {metaUser || "Connected"}</>
          ) : (
            <><XCircle className="h-3 w-3 text-destructive" /> Not Connected</>
          )}
        </Badge>
      </div>
      <Button onClick={onTestConnection} disabled={metaStatus === "testing"} size="sm">
        {metaStatus === "testing" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
        Test Connection
      </Button>
    </section>
  );
}
