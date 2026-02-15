import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePerformanceStory(accountId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["performance-story", accountId],
    queryFn: async () => {
      if (!accountId || accountId === "all") return null;
      const { data, error } = await supabase
        .from("performance_stories" as any)
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!accountId && accountId !== "all",
  });

  const upsert = useMutation({
    mutationFn: async ({ accountId, content }: { accountId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("performance_stories" as any)
        .upsert(
          { account_id: accountId, content, updated_by: user?.id } as any,
          { onConflict: "account_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-story", accountId] });
    },
  });

  return { story: query.data, isLoading: query.isLoading, upsert };
}
