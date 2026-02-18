import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { useAccountContext } from "@/contexts/AccountContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  "Which creatives have the best ROAS right now?",
  "What's hurting my CTR the most?",
  "Which ad types are performing best?",
  "What should I kill and what should I scale?",
  "Summarise performance for this account",
];

export default function AIChatPage() {
  const { selectedAccountId } = useAccountContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: trimmed,
            conversationId,
            accountId: selectedAccountId,
          }),
        }
      );

      if (res.status === 429) {
        toast.error("Rate limit reached — please wait a moment and try again.");
        setMessages(prev => prev.slice(0, -1));
        return;
      }
      if (res.status === 402) {
        toast.error("AI credits exhausted. Top up your workspace to continue.");
        setMessages(prev => prev.slice(0, -1));
        return;
      }
      if (!res.ok) throw new Error("AI service error");

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to get a response. Please try again.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="font-heading text-[32px] text-forest flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-verdant" />
              AI Analyst
            </h1>
            <p className="font-body text-[13px] text-slate font-light mt-0.5">
              Ask questions about your creative performance, trends, and what to do next.
            </p>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-slate hover:text-forest text-[13px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New chat
            </Button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-sage-light flex items-center justify-center">
                <Bot className="h-7 w-7 text-verdant" />
              </div>
              <div>
                <p className="font-heading text-[18px] text-forest mb-1">What would you like to know?</p>
                <p className="font-body text-[13px] text-slate max-w-sm">
                  I have real-time access to your creative data. Ask me anything about performance, trends, or strategy.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="font-body text-[12px] text-slate bg-background border border-border hover:border-verdant hover:text-forest hover:bg-sage-light rounded-full px-3 py-1.5 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-lg bg-sage-light flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-verdant" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 font-body text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-verdant text-white rounded-br-sm"
                    : "bg-background border border-border text-charcoal rounded-bl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-forest prose-headings:text-forest prose-headings:font-heading">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-slate" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-7 w-7 rounded-lg bg-sage-light flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-verdant" />
              </div>
              <div className="bg-background border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-verdant" />
                <span className="font-body text-[13px] text-slate">Thinking…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border pt-4">
          <div className="relative flex items-end gap-2 bg-background border border-border rounded-xl p-3 focus-within:border-verdant transition-colors">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your creative performance…"
              rows={1}
              className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 p-0 font-body text-[13px] text-charcoal placeholder:text-slate min-h-[24px] max-h-32"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="bg-verdant hover:bg-verdant/90 text-white h-8 w-8 p-0 rounded-lg shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="font-body text-[11px] text-muted-foreground text-center mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
