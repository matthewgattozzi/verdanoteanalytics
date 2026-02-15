import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CreativeNotesProps {
  creative: any;
}

export function CreativeNotes({ creative }: CreativeNotesProps) {
  const [notes, setNotes] = useState(creative.notes || "");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setNotes(creative.notes || "");
  }, [creative.notes, creative.ad_id]);

  const isDirty = notes !== (creative.notes || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("creatives", creative.ad_id, {
        method: "PUT",
        body: JSON.stringify({ notes }),
      });
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="font-heading text-[18px] text-forest">Notes</label>
      <textarea
        className="w-full min-h-[80px] rounded-md border border-verdant bg-background px-3 py-2 font-body text-[14px] text-charcoal ring-offset-background placeholder:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        placeholder="Add notes about this creative…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {isDirty && (
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Notes"}
        </Button>
      )}
    </div>
  );
}
