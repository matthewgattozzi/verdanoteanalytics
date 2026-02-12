import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, CheckCircle } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {done ? "Password updated!" : "Choose a new password for your account"}
            </p>
          </div>
        </div>

        {done ? (
          <div className="glass-panel p-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Redirecting you now…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-background"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
