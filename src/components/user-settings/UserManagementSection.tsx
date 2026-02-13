import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, UserPlus, Trash2 } from "lucide-react";

interface UserManagementSectionProps {
  users: any[] | undefined;
  accounts: any[];
  onCreateUser: () => void;
  onDeleteUser: (userId: string) => void;
}

export function UserManagementSection({ users, accounts, onCreateUser, onDeleteUser }: UserManagementSectionProps) {
  return (
    <section className="glass-panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">User Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Create and manage users. Assign roles and link clients to accounts.</p>
        </div>
        <Button size="sm" onClick={onCreateUser}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />Create User
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
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDeleteUser(u.user_id)}>
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
  );
}
