import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";

interface ChangePasswordSectionProps {
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  savingPassword: boolean;
  onChangePassword: () => void;
}

export function ChangePasswordSection({ newPassword, setNewPassword, confirmPassword, setConfirmPassword, savingPassword, onChangePassword }: ChangePasswordSectionProps) {
  return (
    <section className="glass-panel p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-sage" />
        <h2 className="font-heading text-[20px] text-forest">Change Password</h2>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="font-body text-[14px] font-medium text-charcoal">New Password</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="bg-background font-body text-[14px] text-charcoal border-border-light rounded-[4px] placeholder:text-sage" />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-[14px] font-medium text-charcoal">Confirm New Password</Label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="bg-background font-body text-[14px] text-charcoal border-border-light rounded-[4px] placeholder:text-sage" />
        </div>
      </div>
      <Button size="sm" onClick={onChangePassword} disabled={savingPassword || !newPassword || !confirmPassword} className="bg-verdant text-white hover:bg-verdant/90 font-body text-[13px] font-semibold">
        {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
        Update Password
      </Button>
    </section>
  );
}
