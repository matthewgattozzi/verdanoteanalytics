import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, User } from "lucide-react";

interface ProfileInfoSectionProps {
  email: string;
  displayName: string;
  setDisplayName: (v: string) => void;
  role: string | null;
  savingProfile: boolean;
  onSave: () => void;
}

export function ProfileInfoSection({ email, displayName, setDisplayName, role, savingProfile, onSave }: ProfileInfoSectionProps) {
  return (
    <section className="glass-panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Profile Information</h2>
        </div>
        <Badge variant="outline" className="text-xs capitalize">{role}</Badge>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm">Email</Label>
          <Input value={email} disabled className="bg-muted/50" />
          <p className="text-[11px] text-muted-foreground">Email cannot be changed.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Display Name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="bg-background" />
        </div>
      </div>
      <Button size="sm" onClick={onSave} disabled={savingProfile}>
        {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
        Save Profile
      </Button>
    </section>
  );
}
