import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, User, Lock, Shield } from "lucide-react";
import { RenameAccountModal } from "@/components/settings/RenameAccountModal";
import { MetaConnectionSection } from "@/components/user-settings/MetaConnectionSection";
import { AdAccountsSection } from "@/components/user-settings/AdAccountsSection";
import { UserManagementSection } from "@/components/user-settings/UserManagementSection";
import { AddAccountModal } from "@/components/user-settings/AddAccountModal";
import { CreateUserModal } from "@/components/user-settings/CreateUserModal";
import { ConfirmDeleteDialog } from "@/components/user-settings/ConfirmDeleteDialog";
import { useUserSettingsPageState } from "@/hooks/useUserSettingsPageState";

const UserSettingsPage = () => {
  const s = useUserSettingsPageState();

  if (s.loadingProfile) {
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
      <PageHeader title="User Settings" description="Manage your profile, security, and admin preferences." />

      <div className="max-w-2xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-3.5 w-3.5" />Profile
            </TabsTrigger>
            {s.isBuilder && (
              <TabsTrigger value="admin" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />Admin
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
                <Badge variant="outline" className="text-xs capitalize">{s.role}</Badge>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Email</Label>
                  <Input value={s.email} disabled className="bg-muted/50" />
                  <p className="text-[11px] text-muted-foreground">Email cannot be changed.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Display Name</Label>
                  <Input value={s.displayName} onChange={(e) => s.setDisplayName(e.target.value)} placeholder="Your name" className="bg-background" />
                </div>
              </div>
              <Button size="sm" onClick={s.handleSaveProfile} disabled={s.savingProfile}>
                {s.savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
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
                  <Input type="password" value={s.newPassword} onChange={(e) => s.setNewPassword(e.target.value)} placeholder="Enter new password" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Confirm New Password</Label>
                  <Input type="password" value={s.confirmPassword} onChange={(e) => s.setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="bg-background" />
                </div>
              </div>
              <Button size="sm" onClick={s.handleChangePassword} disabled={s.savingPassword || !s.newPassword || !s.confirmPassword}>
                {s.savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
                Update Password
              </Button>
            </section>
          </TabsContent>

          {/* Admin Tab */}
          {s.isBuilder && (
            <TabsContent value="admin" className="space-y-8">
              <MetaConnectionSection metaStatus={s.metaStatus} metaUser={s.metaUser} onTestConnection={s.handleTestConnection} />
              <AdAccountsSection
                accounts={s.accounts}
                syncPending={s.sync.isPending}
                onSyncAll={() => s.sync.mutate({ account_id: "all" })}
                onOpenAddModal={s.handleOpenAddModal}
                onRename={s.setRenamingAccount}
                onDelete={s.setShowDeleteConfirm}
              />
              <UserManagementSection
                users={s.users}
                accounts={s.accounts}
                onCreateUser={() => s.setShowCreateUser(true)}
                onDeleteUser={s.setShowDeleteUserConfirm}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modals */}
      <AddAccountModal
        open={s.showAddModal} onOpenChange={s.setShowAddModal}
        loading={s.loadingAccounts} availableAccounts={s.availableAccounts}
        existingIds={s.existingIds} onAdd={s.handleAddAccount} addPending={s.addAccount.isPending}
      />

      <RenameAccountModal
        account={s.renamingAccount} onClose={() => s.setRenamingAccount(null)}
        onRename={(params) => s.renameAccount.mutate(params, { onSuccess: () => s.setRenamingAccount(null) })}
        onChange={s.setRenamingAccount} isPending={s.renameAccount.isPending}
      />

      <ConfirmDeleteDialog
        open={!!s.showDeleteConfirm} onOpenChange={() => s.setShowDeleteConfirm(null)}
        title="Remove Account"
        description="This will remove the account and all its creatives and name mappings. This action cannot be undone."
        actionLabel="Remove Account"
        onConfirm={() => { if (s.showDeleteConfirm) s.deleteAccount.mutate(s.showDeleteConfirm); s.setShowDeleteConfirm(null); }}
      />

      <CreateUserModal
        open={s.showCreateUser} onOpenChange={s.setShowCreateUser}
        email={s.newUserEmail} setEmail={s.setNewUserEmail}
        password={s.newUserPassword} setPassword={s.setNewUserPassword}
        name={s.newUserName} setName={s.setNewUserName}
        role={s.newUserRole} setRole={s.setNewUserRole}
        accountIds={s.newUserAccountIds} setAccountIds={s.setNewUserAccountIds}
        accounts={s.accounts} onSubmit={s.handleCreateUser} isPending={s.createUser.isPending}
      />

      <ConfirmDeleteDialog
        open={!!s.showDeleteUserConfirm} onOpenChange={() => s.setShowDeleteUserConfirm(null)}
        title="Delete User"
        description="This will permanently delete this user account. This action cannot be undone."
        actionLabel="Delete User"
        onConfirm={() => { if (s.showDeleteUserConfirm) s.deleteUser.mutate(s.showDeleteUserConfirm); s.setShowDeleteUserConfirm(null); }}
      />
    </AppLayout>
  );
};

export default UserSettingsPage;
