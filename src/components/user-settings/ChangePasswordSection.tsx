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
        <Lock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Change Password</h2>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm">New Password</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Confirm New Password</Label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="bg-background" />
        </div>
      </div>
      <Button size="sm" onClick={onChangePassword} disabled={savingPassword || !newPassword || !confirmPassword}>
        {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
        Update Password
      </Button>
    </section>
  );
}
