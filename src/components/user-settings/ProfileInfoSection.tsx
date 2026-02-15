import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <User className="h-4 w-4 text-sage" />
          <h2 className="font-heading text-[20px] text-forest">Profile Information</h2>
        </div>
        <span className="font-label text-[10px] font-semibold tracking-wide bg-sage-light text-forest rounded-[4px] px-2.5 py-1 capitalize">{role}</span>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="font-body text-[14px] font-medium text-charcoal">Email</Label>
          <Input value={email} disabled className="bg-cream-dark text-slate font-body text-[14px] border-border-light rounded-[4px]" />
          <p className="font-body text-[12px] text-sage italic">Email cannot be changed.</p>
        </div>
        <div className="space-y-2">
          <Label className="font-body text-[14px] font-medium text-charcoal">Display Name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="bg-background font-body text-[14px] text-charcoal border-border-light rounded-[4px] placeholder:text-sage" />
        </div>
      </div>
      <Button size="sm" onClick={onSave} disabled={savingProfile} className="bg-verdant text-white hover:bg-verdant/90 font-body text-[13px] font-semibold">
        {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
        Save Profile
      </Button>
    </section>
  );
}
