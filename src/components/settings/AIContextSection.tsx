import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface AIContextSectionProps {
  account: any;
  primaryKpi: string;
  setPrimaryKpi: (v: string) => void;
  secondaryKpis: string;
  setSecondaryKpis: (v: string) => void;
  companyPdfUrl: string | null;
  setCompanyPdfUrl: (v: string | null) => void;
  onSaveSettings: (updates: Record<string, any>) => Promise<void>;
}

export function AIContextSection({
  account, primaryKpi, setPrimaryKpi, secondaryKpis, setSecondaryKpis,
  companyPdfUrl, setCompanyPdfUrl, onSaveSettings,
}: AIContextSectionProps) {
  const [uploadingPdf, setUploadingPdf] = useState(false);

  return (
    <section className="glass-panel p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold">AI Analysis Context</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Helps AI understand your business for better creative analysis. Company name is pulled from the account name.</p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm">Company Info PDF</Label>
        <p className="text-[11px] text-muted-foreground">Upload a PDF with details about the company, products, target audience, etc. This context helps the AI produce more relevant analysis.</p>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) {
                toast.error("File too large — max 10MB.");
                return;
              }
              setUploadingPdf(true);
              try {
                const filePath = `${account.id}/${Date.now()}_${file.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from("company-docs").upload(filePath, file, { upsert: true });
                if (uploadError) throw uploadError;
                const pdfUrl = `company-docs/${uploadData.path}`;
                await onSaveSettings({ company_pdf_url: pdfUrl });
                setCompanyPdfUrl(pdfUrl);
                toast.success("Company info PDF saved successfully.");
              } catch (err: any) {
                toast.error(`Upload failed: ${err.message}`);
              } finally {
                setUploadingPdf(false);
                e.target.value = "";
              }
            }}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-accent cursor-pointer"
            disabled={uploadingPdf}
          />
          {uploadingPdf && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {companyPdfUrl && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Badge variant="outline" className="text-xs">PDF uploaded</Badge>
            <span className="truncate max-w-[200px]">{companyPdfUrl.split("/").pop()}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={async () => {
                const path = companyPdfUrl.replace("company-docs/", "");
                await supabase.storage.from("company-docs").remove([path]);
                await onSaveSettings({ company_pdf_url: null });
                setCompanyPdfUrl(null);
                toast.success("PDF removed");
              }}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Primary KPI</Label>
          <Input value={primaryKpi} onChange={(e) => setPrimaryKpi(e.target.value)} placeholder="e.g. Purchase ROAS > 1.5x" className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Secondary KPIs</Label>
          <Input value={secondaryKpis} onChange={(e) => setSecondaryKpis(e.target.value)} placeholder="e.g. CTR, Hook Rate, Volume" className="bg-background" />
        </div>
      </div>
    </section>
  );
}
