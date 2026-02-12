import { useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SaveViewButtonProps {
  getConfig: () => Record<string, any>;
}

export function SaveViewButton({ getConfig }: SaveViewButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    try {
      const config = getConfig();
      const { error } = await supabase.from("saved_views").insert([{
        user_id: user.id,
        name: name.trim(),
        config: config as any,
      }]);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["saved-views"] });
      toast.success("View saved");
      setName("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Bookmark className="h-3.5 w-3.5" />
          Save View
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2">
          <Label className="text-xs">View name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. TOF Hook Analysis"
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button size="sm" className="w-full" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
