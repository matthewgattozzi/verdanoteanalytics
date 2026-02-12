import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, ArrowLeft, CheckCircle } from "lucide-react";

const ResetPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
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
            <h1 className="text-xl font-semibold tracking-tight">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sent ? "Check your email" : "Enter your email to receive a reset link"}
            </p>
          </div>
        </div>

        {sent ? (
          <div className="glass-panel p-6 space-y-4 text-center">
            <CheckCircle className="h-10 w-10 text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to <strong className="text-foreground">{email}</strong>. Check your inbox and follow the link to set a new password.
            </p>
            <a href="/login">
              <Button variant="outline" className="w-full mt-2">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to Sign In
              </Button>
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-background"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Send Reset Link
            </Button>
            <a href="/login" className="block text-center">
              <Button variant="ghost" size="sm" type="button" className="text-xs text-muted-foreground">
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to Sign In
              </Button>
            </a>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
