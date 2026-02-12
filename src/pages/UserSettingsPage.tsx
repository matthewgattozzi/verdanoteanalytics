import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  Save,
  User,
  Lock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  Building2,
  Users,
  UserPlus,
  CalendarClock,
  Shield,
  Pencil,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  useSettings,
  useTestMeta,
  useAccounts,
  useAddAccount,
  useDeleteAccount,
  useRenameAccount,
  useSync,
  useUsers,
  useCreateUser,
  useDeleteUser,
  useSyncSchedule,
  useUpdateSyncSchedule,
} from "@/hooks/useApi";

const UserSettingsPage = () => {
  const { user, role, isBuilder } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Admin state
  const [metaStatus, setMetaStatus] = useState<"unknown" | "connected" | "disconnected" | "testing">("unknown");
  const [metaUser, setMetaUser] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [renamingAccount, setRenamingAccount] = useState<{ id: string; name: string } | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("client");
  const [newUserAccountIds, setNewUserAccountIds] = useState<string[]>([]);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleHour, setScheduleHour] = useState("11");

  const { data: settings } = useSettings();
  const testMeta = useTestMeta();
  const { data: rawAccounts } = useAccounts();
  const accounts = [...(rawAccounts || [])].sort((a: any, b: any) => a.name.localeCompare(b.name));
  const addAccount = useAddAccount();
  const deleteAccount = useDeleteAccount();
  const renameAccount = useRenameAccount();
  const sync = useSync();
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const { data: syncSchedule } = useSyncSchedule();
  const updateSchedule = useUpdateSyncSchedule();

  const existingIds = new Set((accounts || []).map((a: any) => a.id));

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

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();
    if (data) setDisplayName(data.display_name || "");
    setLoadingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated", description: "Your display name has been saved." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleTestConnection = async () => {
    setMetaStatus("testing");
    try {
      const result = await testMeta.mutateAsync(undefined);
      if (result.connected) {
        setMetaStatus("connected");
        setMetaUser(result.user?.name || null);
        toast({ title: "Connected to Meta", description: `Logged in as ${result.user?.name}. ${result.accounts?.length || 0} ad accounts found.` });
        if (result.tokenWarning) toast({ title: "Token warning", description: result.tokenWarning, variant: "destructive" });
      } else {
        setMetaStatus("disconnected");
        toast({ title: "Connection failed", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      setMetaStatus("disconnected");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
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

  if (loadingProfile) {
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
        title="User Settings"
        description="Manage your profile, security, and admin preferences."
      />

      <div className="max-w-2xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Profile
            </TabsTrigger>
            {isBuilder && (
              <TabsTrigger value="admin" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-8">
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
              <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save Profile
              </Button>
            </section>

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
              <Button size="sm" onClick={handleChangePassword} disabled={savingPassword || !newPassword || !confirmPassword}>
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
                Update Password
              </Button>
            </section>
          </TabsContent>

          {/* Admin Tab — builder only */}
          {isBuilder && (
            <TabsContent value="admin" className="space-y-8">
              {/* Meta Connection */}
              <section className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Meta Connection</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Token is managed securely. Test your connection below.</p>
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

              {/* Ad Accounts */}
              <section className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Ad Accounts</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Add or remove Meta ad accounts.</p>
                  </div>
                  <div className="flex gap-2">
                    {accounts?.length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => sync.mutate({ account_id: "all" })} disabled={sync.isPending}>
                        {sync.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                        Sync All
                      </Button>
                    )}
                    <Button size="sm" onClick={handleOpenAddModal}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add
                    </Button>
                  </div>
                </div>

                {!accounts?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Click 'Add' to connect an ad account from your Meta Business.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Creatives</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.map((acc: any) => (
                          <TableRow key={acc.id}>
                            <TableCell>
                              <div className="text-sm font-medium">{acc.name}</div>
                              <div className="text-[11px] font-mono text-muted-foreground">{acc.id}</div>
                            </TableCell>
                            <TableCell className="text-sm">{acc.creative_count}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => setRenamingAccount({ id: acc.id, name: acc.name })} title="Rename">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(acc.id)}>
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

              {/* Sync Schedule */}
              <section className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      Automated Sync Schedule
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure when data syncs automatically from Meta.</p>
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
                            return <SelectItem key={utcH} value={String(utcH)}>{label}</SelectItem>;
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
                  <p className="text-xs text-muted-foreground">Automatic sync is disabled. You can still sync manually.</p>
                )}
              </section>

              {/* User Management */}
              <section className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">User Management</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Create and manage users. Assign roles and link clients to accounts.</p>
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
            </TabsContent>
          )}
        </Tabs>
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

      {/* Delete Account Confirmation */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account</AlertDialogTitle>
            <AlertDialogDescription>This will remove the account and all its creatives and name mappings. This action cannot be undone.</AlertDialogDescription>
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
            <AlertDialogDescription>This will permanently delete this user account. This action cannot be undone.</AlertDialogDescription>
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

export default UserSettingsPage;
