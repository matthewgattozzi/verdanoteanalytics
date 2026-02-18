import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAccountContext } from "@/contexts/AccountContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "What's my best performing creative?",
  "What should I scale or kill?",
  "Summarise this account's performance",
];

export function AIChatWidget() {
  const { selectedAccountId } = useAccountContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [isOpen]);

  // Reset when account changes
  useEffect(() => {
    setMessages([]);
    setConversationId(null);
  }, [selectedAccountId]);

  const sendMessage = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isLoading) return;

    setMessages(prev => [...prev, { role: "user", content: trimmed }]);
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

      if (res.status === 429) { toast.error("Rate limit reached — try again shortly."); setMessages(p => p.slice(0, -1)); return; }
      if (res.status === 402) { toast.error("AI credits exhausted. Top up your workspace."); setMessages(p => p.slice(0, -1)); return; }
      if (!res.ok) throw new Error("AI error");

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
      if (data.conversationId && !conversationId) setConversationId(data.conversationId);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
      setMessages(p => p.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleReset = () => { setMessages([]); setConversationId(null); setInput(""); };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-verdant shadow-lg hover:bg-verdant/90 transition-all hover:scale-105 flex items-center justify-center group"
          title="AI Analyst"
        >
          <Sparkles className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[560px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-verdant shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-white" />
              <span className="font-heading text-[14px] text-white font-semibold">AI Analyst</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/20 rounded-md"
                  title="New chat"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/20 rounded-md"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-8 w-8 rounded-lg bg-sage-light flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-verdant" />
                  </div>
                  <p className="font-body text-[13px] text-charcoal">
                    Hi! Ask me anything about your creative performance.
                  </p>
                </div>
                <div className="space-y-1.5 px-1">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left font-body text-[12px] text-slate bg-muted/50 hover:bg-sage-light hover:text-forest border border-border hover:border-verdant/40 rounded-lg px-3 py-2 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="h-6 w-6 rounded-md bg-sage-light flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-verdant" />
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-xl px-3 py-2 font-body text-[12.5px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-verdant text-white rounded-br-sm"
                        : "bg-muted text-charcoal rounded-bl-sm border border-border"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0 prose-strong:text-forest [&_p]:text-[12.5px] [&_li]:text-[12.5px]">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="h-6 w-6 rounded-md bg-sage-light flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-verdant" />
                    </div>
                    <div className="bg-muted border border-border rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-verdant" />
                      <span className="font-body text-[12px] text-slate">Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border p-3">
            <div className="flex items-end gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2 focus-within:border-verdant transition-colors">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your ads…"
                rows={1}
                className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 p-0 font-body text-[12.5px] text-charcoal placeholder:text-slate min-h-[20px] max-h-24 bg-transparent"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="bg-verdant hover:bg-verdant/90 text-white h-7 w-7 p-0 rounded-lg shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
