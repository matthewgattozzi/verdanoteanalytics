import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Upload,
  RefreshCw,
  Clock,
  Building2,
  Users,
  UserPlus,
  Pencil,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { CalendarClock } from "lucide-react";
import {
  useSettings,
  useSaveSettings,
  useTestMeta,
  useAccounts,
  useAddAccount,
  useDeleteAccount,
  useToggleAccount,
  useRenameAccount,
  useUploadMappings,
  useSync,
  useUpdateAccountSettings,
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useSyncSchedule,
  useUpdateSyncSchedule,
} from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

function AccountSyncSettings({ account, allAccounts, onSave, onApplyToAll, isPending }: { account: any; allAccounts: any[]; onSave: (account: any, dateRange: string, roasThreshold: string, spendThreshold: string, companyDescription: string, primaryKpi: string, secondaryKpis: string) => void; onApplyToAll: (dateRange: string, roasThreshold: string, spendThreshold: string) => void; isPending: boolean }) {
  const [dateRange, setDateRange] = useState(String(account.date_range_days || 30));
  const [roasThreshold, setRoasThreshold] = useState(String(account.winner_roas_threshold || 2.0));
  const [spendThreshold, setSpendThreshold] = useState(String(account.iteration_spend_threshold || 50));
  const [companyDescription, setCompanyDescription] = useState(account.company_description || "");
  const [primaryKpi, setPrimaryKpi] = useState(account.primary_kpi || "Purchase ROAS > 1.5x");
  const [secondaryKpis, setSecondaryKpis] = useState(account.secondary_kpis || "CTR, Hook Rate, Volume");

  return (
    <section className="glass-panel p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold">{account.name} — Settings</h2>
        <p className="text-[11px] font-mono text-muted-foreground">{account.id}</p>
      </div>

      {/* AI Business Context */}
      <div className="space-y-3 border-b border-border pb-4">
        <h3 className="text-sm font-medium text-muted-foreground">AI Analysis Context</h3>
        <div className="space-y-2">
          <Label htmlFor={`desc-${account.id}`} className="text-sm">Company / Product Description</Label>
          <Input id={`desc-${account.id}`} value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder="e.g. DTC supplement brand" className="bg-background" />
          <p className="text-[11px] text-muted-foreground">Helps AI understand your business context for better analysis.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`kpi1-${account.id}`} className="text-sm">Primary KPI</Label>
            <Input id={`kpi1-${account.id}`} value={primaryKpi} onChange={(e) => setPrimaryKpi(e.target.value)} placeholder="e.g. Purchase ROAS > 1.5x" className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`kpi2-${account.id}`} className="text-sm">Secondary KPIs</Label>
            <Input id={`kpi2-${account.id}`} value={secondaryKpis} onChange={(e) => setSecondaryKpis(e.target.value)} placeholder="e.g. CTR, Hook Rate, Volume" className="bg-background" />
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`dr-${account.id}`} className="text-sm">Date Range (days)</Label>
          <Input id={`dr-${account.id}`} type="number" value={dateRange} onChange={(e) => setDateRange(e.target.value)} min="1" max="365" className="bg-background" />
          <p className="text-[11px] text-muted-foreground">How many days of data to pull on each sync.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`roas-${account.id}`} className="text-sm">Winner ROAS Threshold</Label>
          <Input id={`roas-${account.id}`} type="number" value={roasThreshold} onChange={(e) => setRoasThreshold(e.target.value)} step="0.1" min="0" className="bg-background" />
          <p className="text-[11px] text-muted-foreground">Minimum ROAS to consider a creative a "winner" (BOF).</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`spend-${account.id}`} className="text-sm">Iteration Spend Threshold ($)</Label>
          <Input id={`spend-${account.id}`} type="number" value={spendThreshold} onChange={(e) => setSpendThreshold(e.target.value)} min="0" className="bg-background" />
          <p className="text-[11px] text-muted-foreground">Minimum spend to include a creative in iteration analysis.</p>
        </div>
      </div>
      <div className="pt-2 flex items-center gap-2">
        <Button size="sm" onClick={() => onSave(account, dateRange, roasThreshold, spendThreshold, companyDescription, primaryKpi, secondaryKpis)} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Save Settings
        </Button>
        {allAccounts.length > 1 && (
          <Button size="sm" variant="outline" onClick={() => onApplyToAll(dateRange, roasThreshold, spendThreshold)} disabled={isPending}>
            Apply to All Accounts
          </Button>
        )}
      </div>
    </section>
  );
}

const SettingsPage = () => {
  const { isBuilder } = useAuth();
  const [showToken, setShowToken] = useState(false);
  const [metaToken, setMetaToken] = useState("");
  const [metaStatus, setMetaStatus] = useState<"unknown" | "connected" | "disconnected" | "testing">("unknown");
  const [metaUser, setMetaUser] = useState<string | null>(null);

  // Account management state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCsvModal, setShowCsvModal] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvMappings, setCsvMappings] = useState<any[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User management state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("client");
  const [newUserAccountIds, setNewUserAccountIds] = useState<string[]>([]);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState<string | null>(null);
  const [renamingAccount, setRenamingAccount] = useState<{ id: string; name: string } | null>(null);

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const saveSettings = useSaveSettings();
  const testMeta = useTestMeta();
  const { data: rawAccounts, isLoading: accountsLoading } = useAccounts();
  const accounts = [...(rawAccounts || [])].sort((a: any, b: any) => a.name.localeCompare(b.name));
  const addAccount = useAddAccount();
  const deleteAccount = useDeleteAccount();
  const toggleAccount = useToggleAccount();
  const renameAccount = useRenameAccount();
  const uploadMappings = useUploadMappings();
  const updateAccountSettings = useUpdateAccountSettings();
  const sync = useSync();
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const { data: syncSchedule, isLoading: scheduleLoading } = useSyncSchedule();
  const updateSchedule = useUpdateSyncSchedule();
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleHour, setScheduleHour] = useState("11"); // UTC hour (11 = 6 AM EST)

  useEffect(() => {
    if (syncSchedule) {
      setScheduleEnabled(syncSchedule.enabled !== false);
      if (syncSchedule.hour_utc !== undefined && syncSchedule.hour_utc !== null) {
        setScheduleHour(String(syncSchedule.hour_utc));
      }
    }
  }, [syncSchedule]);

  useEffect(() => {
    if (settings) {
      setMetaStatus(settings.meta_access_token_set === "true" ? "connected" : "disconnected");
    }
  }, [settings]);

  const handleTestConnection = async () => {
    setMetaStatus("testing");
    try {
      const result = await testMeta.mutateAsync(undefined);
      if (result.connected) {
        setMetaStatus("connected");
        setMetaUser(result.user?.name || null);
        toast({ title: "Connected to Meta", description: `Logged in as ${result.user?.name}. ${result.accounts?.length || 0} ad accounts found.` });
        if (result.tokenWarning) {
          toast({ title: "Token warning", description: result.tokenWarning, variant: "destructive" });
        }
      } else {
        setMetaStatus("disconnected");
        toast({ title: "Connection failed", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      setMetaStatus("disconnected");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveAccountSettings = (account: any, dateRange: string, roasThreshold: string, spendThreshold: string, companyDescription: string, primaryKpi: string, secondaryKpis: string) => {
    updateAccountSettings.mutate({
      id: account.id,
      date_range_days: parseInt(dateRange) || 30,
      winner_roas_threshold: parseFloat(roasThreshold) || 2.0,
      iteration_spend_threshold: parseFloat(spendThreshold) || 50,
      company_description: companyDescription || null,
      primary_kpi: primaryKpi || null,
      secondary_kpis: secondaryKpis || null,
    });
  };

  const handleApplyToAll = (dateRange: string, roasThreshold: string, spendThreshold: string) => {
    (accounts || []).forEach((acc: any) => {
      updateAccountSettings.mutate({
        id: acc.id,
        date_range_days: parseInt(dateRange) || 30,
        winner_roas_threshold: parseFloat(roasThreshold) || 2.0,
        iteration_spend_threshold: parseFloat(spendThreshold) || 50,
      });
    });
  };

  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    setLoadingAccounts(true);
    try {
      const result = await testMeta.mutateAsync(undefined);
      if (result.connected) {
        setAvailableAccounts(result.accounts || []);
      } else {
        toast({ title: "Not connected", description: "Meta token not configured.", variant: "destructive" });
        setShowAddModal(false);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch accounts.", variant: "destructive" });
      setShowAddModal(false);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAddAccount = async (account: { id: string; name: string }) => {
    await addAccount.mutateAsync(account);
    sync.mutate({ account_id: account.id, sync_type: "initial" });
    setShowAddModal(false);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast({ title: "Invalid CSV", description: "File must have headers and at least one row.", variant: "destructive" }); return; }
      const headers = lines[0].split(",").map((h) => h.trim());
      const required = ["UniqueCode", "Type", "Person", "Style", "Product", "Hook", "Theme"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) { toast({ title: "Missing columns", description: `Required: ${missing.join(", ")}`, variant: "destructive" }); return; }
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });
      setCsvPreview(rows.slice(0, 5));
      setCsvMappings(rows);
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvUpload = async () => {
    if (!showCsvModal || csvMappings.length === 0) return;
    await uploadMappings.mutateAsync({ accountId: showCsvModal, mappings: csvMappings });
    setShowCsvModal(null);
    setCsvPreview([]);
    setCsvMappings([]);
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) return;
    await createUser.mutateAsync({
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
      display_name: newUserName || undefined,
      account_ids: newUserRole === "client" ? newUserAccountIds : undefined,
    });
    setShowCreateUser(false);
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserName("");
    setNewUserRole("client");
    setNewUserAccountIds([]);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const existingIds = new Set((accounts || []).map((a: any) => a.id));
  const isLoading = settingsLoading || accountsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Account Settings"
        description="Configure your ad accounts, sync preferences, and team members."
      />

      <div className="max-w-2xl space-y-8">
        {/* Meta Connection Status — builder only */}
        {isBuilder && (
          <section className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Meta Connection</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Token is managed securely. Test your connection below.
                </p>
              </div>
              <Badge variant="outline" className="gap-1.5">
                {metaStatus === "testing" ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Testing</>
                ) : metaStatus === "connected" ? (
                  <><CheckCircle2 className="h-3 w-3 text-success" /> {metaUser || "Connected"}</>
                ) : (
                  <><XCircle className="h-3 w-3 text-destructive" /> Not Connected</>
                )}
              </Badge>
            </div>
            <Button onClick={handleTestConnection} disabled={metaStatus === "testing"} size="sm">
              {metaStatus === "testing" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Test Connection
            </Button>
          </section>
        )}

        {/* Ad Accounts */}
        <section className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Ad Accounts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect and manage your Meta ad accounts.
              </p>
            </div>
            <div className="flex gap-2">
              {accounts?.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => sync.mutate({ account_id: "all" })} disabled={sync.isPending}>
                  {sync.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Sync All
                </Button>
              )}
              {isBuilder && (
                <Button size="sm" onClick={handleOpenAddModal}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add
                </Button>
              )}
            </div>
          </div>

          {!accounts?.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {isBuilder ? "Click 'Add' to connect an ad account from your Meta Business." : "No accounts configured yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Creatives</TableHead>
                    <TableHead>Untagged</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account: any) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{account.name}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">{account.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={account.is_active}
                          onCheckedChange={(checked) => toggleAccount.mutate({ id: account.id, is_active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-sm">{account.creative_count}</TableCell>
                      <TableCell>
                        {account.untagged_count > 0 ? (
                          <Badge variant="outline" className="bg-tag-untagged/10 text-tag-untagged border-tag-untagged/30 text-xs">
                            {account.untagged_count}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(account.last_synced_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setRenamingAccount({ id: account.id, name: account.name })} title="Rename">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => sync.mutate({ account_id: account.id })} disabled={sync.isPending} title="Sync">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setShowCsvModal(account.id); setCsvPreview([]); setCsvMappings([]); }} title="Upload CSV">
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                          {isBuilder && (
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(account.id)} title="Remove">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Per-Account Sync Settings */}
        {accounts?.map((account: any) => (
          <AccountSyncSettings key={account.id} account={account} allAccounts={accounts || []} onSave={handleSaveAccountSettings} onApplyToAll={handleApplyToAll} isPending={updateAccountSettings.isPending} />
        ))}

        {/* Sync Schedule — builder only */}
        {isBuilder && (
          <section className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Automated Sync Schedule
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure when data syncs automatically from Meta.
                </p>
              </div>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={(checked) => {
                  setScheduleEnabled(checked);
                  updateSchedule.mutate({ enabled: checked, hour_utc: parseInt(scheduleHour) });
                }}
              />
            </div>

            {scheduleEnabled && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Sync Time (EST)</Label>
                  <Select
                    value={scheduleHour}
                    onValueChange={(val) => {
                      setScheduleHour(val);
                      updateSchedule.mutate({ enabled: true, hour_utc: parseInt(val) });
                    }}
                  >
                    <SelectTrigger className="bg-background w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, utcH) => {
                        const estH = ((utcH - 5) + 24) % 24;
                        const label = `${estH > 12 ? estH - 12 : estH || 12}:00 ${estH >= 12 ? "PM" : "AM"} EST`;
                        return (
                          <SelectItem key={utcH} value={String(utcH)}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {syncSchedule?.description || "Daily at 6:00 AM EST"}
                </div>

                {updateSchedule.isPending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating schedule...
                  </div>
                )}
              </div>
            )}

            {!scheduleEnabled && (
              <p className="text-xs text-muted-foreground">
                Automatic sync is disabled. You can still sync manually from the Ad Accounts section above.
              </p>
            )}
          </section>
        )}

        {/* User Management — builder only */}
        {isBuilder && (
          <section className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">User Management</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create and manage users. Assign roles and link clients to accounts.
                </p>
              </div>
              <Button size="sm" onClick={() => setShowCreateUser(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Create User
              </Button>
            </div>

            {!users?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No users yet. Create your first user above.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Linked Accounts</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u: any) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{u.display_name || u.email}</div>
                            {u.display_name && <div className="text-[11px] text-muted-foreground">{u.email}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{u.role || "none"}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.account_ids?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.account_ids.map((id: string) => {
                                const acc = (accounts || []).find((a: any) => a.id === id);
                                return <Badge key={id} variant="secondary" className="text-[10px]">{acc?.name || id}</Badge>;
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{u.role === "client" ? "None" : "All"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteUserConfirm(u.user_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        )}

        {/* AI Analysis Info */}
        <section className="glass-panel p-6 space-y-2">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-semibold">AI Creative Analysis</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI-powered creative breakdowns are built in — no API key needed.
              </p>
            </div>
            <Badge variant="outline" className="gap-1.5 flex-shrink-0">
              <CheckCircle2 className="h-3 w-3 text-success" /> Built-in
            </Badge>
          </div>
        </section>
      </div>

      {/* Add Account Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ad Account</DialogTitle>
            <DialogDescription>Select an account from your Meta Business to connect.</DialogDescription>
          </DialogHeader>
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No ad accounts found.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {availableAccounts.map((acc) => (
                <button
                  key={acc.id}
                  disabled={existingIds.has(acc.id) || addAccount.isPending}
                  onClick={() => handleAddAccount({ id: acc.id, name: acc.name })}
                  className="w-full flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                >
                  <div>
                    <div className="text-sm font-medium">{acc.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{acc.id}</div>
                  </div>
                  {existingIds.has(acc.id) ? (
                    <Badge variant="outline" className="text-xs">Added</Badge>
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Account Modal */}
      <Dialog open={!!renamingAccount} onOpenChange={() => setRenamingAccount(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>Enter a new display name for this account.</DialogDescription>
          </DialogHeader>
          <Input
            value={renamingAccount?.name || ""}
            onChange={(e) => setRenamingAccount(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder="Account name"
            className="bg-background"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingAccount(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (renamingAccount && renamingAccount.name.trim()) {
                  renameAccount.mutate({ id: renamingAccount.id, name: renamingAccount.name.trim() });
                  setRenamingAccount(null);
                }
              }}
              disabled={!renamingAccount?.name.trim() || renameAccount.isPending}
            >
              {renameAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the account and all its creatives and name mappings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (showDeleteConfirm) deleteAccount.mutate(showDeleteConfirm); setShowDeleteConfirm(null); }}
            >
              Remove Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Upload Modal */}
      <Dialog open={!!showCsvModal} onOpenChange={() => { setShowCsvModal(null); setCsvPreview([]); setCsvMappings([]); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Name Mappings</DialogTitle>
            <DialogDescription>
              Upload a CSV with columns: UniqueCode, Type, Person, Style, Product, Hook, Theme
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-border file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-accent cursor-pointer"
            />
            {csvPreview.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Preview (first 5 rows of {csvMappings.length}):</p>
                <div className="overflow-x-auto border border-border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">UniqueCode</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Person</TableHead>
                        <TableHead className="text-xs">Style</TableHead>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-xs">Hook</TableHead>
                        <TableHead className="text-xs">Theme</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{row.UniqueCode}</TableCell>
                          <TableCell className="text-xs">{row.Type}</TableCell>
                          <TableCell className="text-xs">{row.Person}</TableCell>
                          <TableCell className="text-xs">{row.Style}</TableCell>
                          <TableCell className="text-xs">{row.Product}</TableCell>
                          <TableCell className="text-xs">{row.Hook}</TableCell>
                          <TableCell className="text-xs">{row.Theme}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCsvModal(null); setCsvPreview([]); setCsvMappings([]); }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCsvUpload} disabled={csvMappings.length === 0 || uploadMappings.isPending}>
              {uploadMappings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Upload {csvMappings.length} Mappings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a new user account with a role assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Email</Label>
              <Input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="user@example.com" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Password</Label>
              <Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Strong password" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Display Name (optional)</Label>
              <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="John Doe" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="builder">Builder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUserRole === "client" && accounts?.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Linked Accounts</Label>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {accounts.map((acc: any) => (
                    <label key={acc.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={newUserAccountIds.includes(acc.id)}
                        onCheckedChange={(checked) => {
                          setNewUserAccountIds(prev =>
                            checked ? [...prev, acc.id] : prev.filter(id => id !== acc.id)
                          );
                        }}
                      />
                      {acc.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUser(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={!newUserEmail || !newUserPassword || createUser.isPending}>
              {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!showDeleteUserConfirm} onOpenChange={() => setShowDeleteUserConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (showDeleteUserConfirm) deleteUser.mutate(showDeleteUserConfirm); setShowDeleteUserConfirm(null); }}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default SettingsPage;
