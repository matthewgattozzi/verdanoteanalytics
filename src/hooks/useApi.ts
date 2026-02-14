// Re-export all domain-specific API hooks for backward compatibility
export { useSettings, useSaveSettings, useTestMeta } from "./useSettingsApi";
export { useAccounts, useAddAccount, useToggleAccount, useRenameAccount, useUpdateAccountSettings, useDeleteAccount, useUploadMappings } from "./useAccountsApi";
export { useSync, useCancelSync, useSyncHistory } from "./useSyncApi";
export { useReports, useGenerateReport, useDeleteReport, useSendReportToSlack, useReportSchedules, useUpsertReportSchedule } from "./useReportsApi";
export { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "./useUsersApi";
