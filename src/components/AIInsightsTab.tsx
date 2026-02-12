import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Trash2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountContext } from "@/contexts/AccountContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface AIInsight {
  id: string;
  title: string;
  analysis: string;
  creative_count: number;
  total_spend: number;
  account_id: string | null;
  created_at: string;
}

export function AIInsightsTab() {
  const { user } = useAuth();
  const { selectedAccountId, selectedAccount } = useAccountContext();
  const queryClient = useQueryClient();
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["ai-insights", selectedAccountId],
    queryFn: async () => {
      let query = supabase
        .from("ai_insights")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (selectedAccountId && selectedAccountId !== "all") {
        query = query.eq("account_id", selectedAccountId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as AIInsight[]) || [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_insights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
      toast.success("Analysis deleted");
    },
  });

  const runAnalysis = async () => {
    if (isStreaming) return;
    setIsStreaming(true);
    setStreamedContent("");

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            account_id: selectedAccountId || "all",
            stream: true,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            // Anthropic SSE format: content_block_delta with delta.text
            let content: string | undefined;
            if (parsed.type === "content_block_delta") {
              content = parsed.delta?.text;
            } else if (parsed.choices?.[0]?.delta?.content) {
              // Fallback: OpenAI format
              content = parsed.choices[0].delta.content;
            }
            if (content) {
              fullContent += content;
              setStreamedContent(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            let content: string | undefined;
            if (parsed.type === "content_block_delta") {
              content = parsed.delta?.text;
            } else if (parsed.choices?.[0]?.delta?.content) {
              content = parsed.choices[0].delta.content;
            }
            if (content) {
              fullContent += content;
              setStreamedContent(fullContent);
            }
          } catch { /* ignore */ }
        }
      }

      // Save the completed analysis
      if (fullContent) {
        const { error } = await supabase.from("ai_insights").insert([{
          user_id: user!.id,
          account_id: selectedAccountId && selectedAccountId !== "all" ? selectedAccountId : null,
          title: `Analysis — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          analysis: fullContent,
          creative_count: 0,
          total_spend: 0,
        }]);
        if (!error) {
          queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
        }
      }

      toast.success("Analysis complete");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setIsStreaming(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Run Analysis */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Creative Analysis
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Run a comprehensive AI analysis of your creative performance data
              {selectedAccount ? ` for ${selectedAccount.name}` : ""}.
            </p>
          </div>
          <Button onClick={runAnalysis} disabled={isStreaming} size="sm" className="gap-1.5">
            {isStreaming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {isStreaming ? "Analyzing…" : "Run Analysis"}
          </Button>
        </div>

        {/* Streaming output */}
        {(isStreaming || streamedContent) && (
          <div className="mt-4 border border-border rounded-lg p-4 bg-background max-h-[600px] overflow-y-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{streamedContent || "Starting analysis…"}</ReactMarkdown>
            </div>
            {isStreaming && (
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating insights…
              </div>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Analysis History
        </h3>

        {historyLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="glass-panel flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No analyses yet. Run your first analysis above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((insight) => (
              <div key={insight.id} className="glass-panel overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{insight.title}</span>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {formatDate(insight.created_at)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(insight.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {expandedId === insight.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {expandedId === insight.id && (
                  <div className="px-4 pb-4 border-t border-border">
                    <div className="prose prose-sm dark:prose-invert max-w-none mt-3 max-h-[500px] overflow-y-auto">
                      <ReactMarkdown>{insight.analysis}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
