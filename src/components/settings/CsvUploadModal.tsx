import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const CSV_COLUMNS = ["UniqueCode", "Type", "Person", "Style", "Product", "Hook", "Theme"];

interface CsvUploadModalProps {
  open: boolean;
  onClose: () => void;
  csvPreview: any[];
  csvMappings: any[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function CsvUploadModal({ open, onClose, csvPreview, csvMappings, onFileChange, onConfirm, isPending }: CsvUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Name Mappings</DialogTitle>
          <DialogDescription>Upload a CSV with columns: {CSV_COLUMNS.join(", ")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-accent cursor-pointer" />
          {csvPreview.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">Preview (first 5 rows of {csvMappings.length}):</p>
              <div className="overflow-x-auto border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {CSV_COLUMNS.map(h => <TableHead key={h} className="text-xs">{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreview.map((row, i) => (
                      <TableRow key={i}>
                        {CSV_COLUMNS.map(h => (
                          <TableCell key={h} className={`text-xs ${h === "UniqueCode" ? "font-mono" : ""}`}>{row[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} disabled={csvMappings.length === 0 || isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Upload {csvMappings.length} Mappings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
