import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useMutationWithToast } from "./useMutationWithToast";

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => apiFetch("user-management") });
}

export function useCreateUser() {
  return useMutationWithToast({
    mutationFn: (user: { email: string; password: string; role: string; display_name?: string; account_ids?: string[] }) =>
      apiFetch("user-management", "", { method: "POST", body: JSON.stringify(user) }),
    invalidateKeys: [["users"]],
    successMessage: "User created",
    errorMessage: "Error creating user",
  });
}

export function useUpdateUser() {
  return useMutationWithToast({
    mutationFn: ({ userId, ...data }: { userId: string; role?: string; account_ids?: string[]; display_name?: string }) =>
      apiFetch("user-management", userId, { method: "PUT", body: JSON.stringify(data) }),
    invalidateKeys: [["users"]],
    successMessage: "User updated",
    errorMessage: "Error updating user",
  });
}

export function useDeleteUser() {
  return useMutationWithToast({
    mutationFn: (userId: string) => apiFetch("user-management", userId, { method: "DELETE" }),
    invalidateKeys: [["users"]],
    successMessage: "User deleted",
    errorMessage: "Error deleting user",
  });
}
