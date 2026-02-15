import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Leaf } from "lucide-react";

const LoginPage = () => {
  const { signIn, user, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'radial-gradient(ellipse 120% 80% at 30% 20%, hsl(147 22% 90% / 0.7) 0%, transparent 50%), radial-gradient(ellipse 100% 60% at 70% 80%, hsl(152 18% 88% / 0.5) 0%, transparent 50%), hsl(40 33% 96%)',
      }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: 'hsl(40 33% 96%)',
      }}
    >
      {/* Soft gradient glow behind modal */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, hsl(152 40% 75% / 0.45) 0%, hsl(152 30% 80% / 0.2) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
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
            <h1 className="text-2xl font-semibold tracking-tight">Verdanote</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Creative analytics, simplified</p>
          </div>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: 'hsl(40 38% 98%)',
            boxShadow: '8px 8px 16px hsl(150 12% 82%), -6px -6px 12px hsl(40 30% 99%)',
            border: '1px solid hsl(147 22% 94% / 0.6)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
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

            <div className="flex items-center justify-end">
              <a
                href="/reset-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </a>
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Leaf className="h-4 w-4 mr-1.5" />}
              Sign In
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-muted-foreground/60">
          Accounts are provisioned by your admin.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
