import { AppLayout } from "@/components/AppLayout";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { MediaRefreshBanner } from "@/components/MediaRefreshBanner";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Shield } from "lucide-react";
import { ProfileInfoSection } from "@/components/user-settings/ProfileInfoSection";
import { ChangePasswordSection } from "@/components/user-settings/ChangePasswordSection";
import { RenameAccountModal } from "@/components/settings/RenameAccountModal";
import { MetaConnectionSection } from "@/components/user-settings/MetaConnectionSection";
import { AdAccountsSection } from "@/components/user-settings/AdAccountsSection";
import { UserManagementSection } from "@/components/user-settings/UserManagementSection";
import { AddAccountModal } from "@/components/user-settings/AddAccountModal";
import { CreateUserModal } from "@/components/user-settings/CreateUserModal";
import { ConfirmDeleteDialog } from "@/components/user-settings/ConfirmDeleteDialog";
import { useUserSettingsPageState } from "@/hooks/useUserSettingsPageState";
import { useIsSyncing } from "@/hooks/useIsSyncing";
import { SyncHistorySection } from "@/components/settings/SyncHistorySection";

const UserSettingsPage = () => {
  const s = useUserSettingsPageState();
  const isSyncing = useIsSyncing();

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
      <SyncStatusBanner />
      <MediaRefreshBanner />

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
            <ProfileInfoSection
              email={s.email}
              displayName={s.displayName}
              setDisplayName={s.setDisplayName}
              role={s.role}
              savingProfile={s.savingProfile}
              onSave={s.handleSaveProfile}
            />
            <ChangePasswordSection
              newPassword={s.newPassword}
              setNewPassword={s.setNewPassword}
              confirmPassword={s.confirmPassword}
              setConfirmPassword={s.setConfirmPassword}
              savingPassword={s.savingPassword}
              onChangePassword={s.handleChangePassword}
            />
          </TabsContent>

          {/* Admin Tab */}
          {s.isBuilder && (
            <TabsContent value="admin" className="space-y-8">
              <MetaConnectionSection metaStatus={s.metaStatus} metaUser={s.metaUser} onTestConnection={s.handleTestConnection} />
              <AdAccountsSection
                accounts={s.accounts}
                syncPending={s.sync.isPending || isSyncing}
                onSyncAll={() => s.sync.mutate({ account_id: "all" })}
                onRefreshAllMedia={() => s.refreshMedia.mutate(undefined)}
                refreshAllMediaPending={s.refreshMedia.isPending}
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
              <SyncHistorySection />
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
