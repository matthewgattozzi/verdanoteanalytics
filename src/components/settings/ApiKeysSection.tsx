import { useState } from "react";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey } from "@/hooks/useApiKeysApi";
import { ConfirmDeleteDialog } from "@/components/user-settings/ConfirmDeleteDialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export function ApiKeysSection() {
  const { isBuilder } = useAuth();
  const { data: keys = [], isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const deleteKey = useDeleteApiKey();

  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  // Defense-in-depth: only builders can access API keys
  if (!isBuilder) return null;

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    const key = await createKey.mutateAsync(newKeyName.trim());
    setRevealedKey(key);
    setShowKey(true);
    setNewKeyName("");
    toast.success("API key created — copy it now, it won't be shown again");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-[18px] text-forest font-semibold mb-1">API Keys</h2>
        <p className="font-body text-[13px] text-slate">
          Use API keys to access Verdanote data programmatically. Keys are read-only by default.
        </p>
      </div>

      {/* Base URL reference */}
      <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
        <p className="font-body text-[12px] text-slate font-medium uppercase tracking-wide">Base URL</p>
        <div className="flex items-center gap-2">
          <code className="font-mono text-[12px] text-charcoal bg-background px-3 py-1.5 rounded border border-border flex-1 truncate">
            {baseUrl}
          </code>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={() => handleCopy(baseUrl)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-1 mt-2">
          {[
            ["GET /creatives", "List all creatives"],
            ["GET /creatives/:id", "Get a specific creative"],
            ["GET /accounts", "List ad accounts"],
            ["GET /metrics", "Aggregated performance metrics"],
          ].map(([endpoint, desc]) => (
            <div key={endpoint} className="flex items-center gap-3">
              <code className="font-mono text-[11px] text-verdant bg-verdant/5 px-2 py-0.5 rounded shrink-0">{endpoint}</code>
              <span className="font-body text-[11px] text-slate">{desc}</span>
            </div>
          ))}
        </div>
        <p className="font-body text-[11px] text-slate mt-2">
          Pass your key via: <code className="font-mono text-[11px] bg-background px-1.5 py-0.5 rounded border border-border">x-api-key: your_key</code>
        </p>
      </div>

      {/* Create new key */}
      <div className="space-y-3">
        <p className="font-body text-[13px] text-charcoal font-medium">Create New Key</p>
        <div className="flex gap-2">
          <Input
            placeholder="Key name (e.g. My Integration)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            maxLength={100}
            className="flex-1"
          />
          <Button
            onClick={handleCreate}
            disabled={!newKeyName.trim() || createKey.isPending}
            className="bg-verdant hover:bg-verdant/90 text-white gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            {createKey.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="font-body text-[13px] text-amber-800 font-medium">Copy your key now — it won't be shown again.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-[12px] text-amber-900 bg-white border border-amber-200 px-3 py-2 rounded flex-1 truncate">
              {showKey ? revealedKey : "•".repeat(revealedKey.length)}
            </code>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={() => setShowKey(v => !v)}>
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={() => handleCopy(revealedKey)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="text-[11px] text-amber-700 h-auto p-0" onClick={() => setRevealedKey(null)}>
            I've saved my key, dismiss
          </Button>
        </div>
      )}

      {/* Keys list */}
      <div className="space-y-2">
        {isLoading && (
          <div className="py-8 text-center font-body text-[13px] text-slate">Loading keys…</div>
        )}
        {!isLoading && keys.length === 0 && (
          <div className="py-8 text-center flex flex-col items-center gap-2">
            <Key className="h-8 w-8 text-muted-foreground" />
            <p className="font-body text-[13px] text-slate">No API keys yet. Create one above.</p>
          </div>
        )}
        {keys.map((key) => (
          <div
            key={key.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${key.is_active ? "border-border bg-background" : "border-border/50 bg-muted/30 opacity-60"}`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {key.is_active
                ? <CheckCircle2 className="h-4 w-4 text-verdant shrink-0" />
                : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-body text-[13px] text-charcoal font-medium truncate">{key.name}</span>
                  {!key.is_active && (
                    <span className="font-label text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Revoked</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <code className="font-mono text-[11px] text-slate">{key.key_prefix}…</code>
                  {key.last_used_at ? (
                    <span className="font-body text-[11px] text-slate flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Used {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="font-body text-[11px] text-muted-foreground">Never used</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {key.is_active && (
                <Button
                  size="sm" variant="ghost"
                  className="h-7 text-[11px] text-slate hover:text-amber-700"
                  onClick={() => setConfirmRevoke(key.id)}
                >
                  Revoke
                </Button>
              )}
              <Button
                size="sm" variant="ghost"
                className="h-7 w-7 p-0 text-slate hover:text-destructive"
                onClick={() => setConfirmDelete(key.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDeleteDialog
        open={!!confirmRevoke}
        onOpenChange={() => setConfirmRevoke(null)}
        title="Revoke API Key"
        description="This will immediately disable this key. Any integrations using it will stop working."
        actionLabel="Revoke Key"
        onConfirm={() => { if (confirmRevoke) revokeKey.mutate(confirmRevoke); setConfirmRevoke(null); }}
      />

      <ConfirmDeleteDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Delete API Key"
        description="This will permanently delete this key record. This cannot be undone."
        actionLabel="Delete Key"
        onConfirm={() => { if (confirmDelete) deleteKey.mutate(confirmDelete); setConfirmDelete(null); }}
      />
    </div>
  );
}
