import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Lock } from "lucide-react";

const UpdatePasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate("/"), 2000);
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'hsl(40 33% 96%)' }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & branding */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              boxShadow: '5px 5px 10px hsl(150 12% 82%), -4px -4px 8px hsl(40 30% 99%)',
              background: 'hsl(40 38% 98%)',
            }}
          >
            <img src="/favicon.png" alt="Verdanote" className="h-14 w-14" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {done ? "Password updated!" : "Choose a new password for your account"}
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: 'hsl(40 38% 98%)',
            boxShadow: '8px 8px 16px hsl(150 12% 82%), -6px -6px 12px hsl(40 30% 99%)',
            border: '1px solid hsl(147 22% 94% / 0.6)',
          }}
        >
          {done ? (
            <div className="space-y-5 text-center">
              <CheckCircle className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Redirecting you now…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div
                  className="rounded-xl px-3 py-2 text-xs text-destructive"
                  style={{
                    boxShadow: 'inset 2px 2px 4px hsl(150 12% 84%), inset -1px -1px 3px hsl(40 30% 98%)',
                    background: 'hsl(40 33% 96%)',
                  }}
                >
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
                Update Password
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-muted-foreground/60">
          Accounts are provisioned by your admin.
        </p>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
