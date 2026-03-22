import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Sparkles, Send, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatbot, type ChatMessage, type ChatAction } from "@/hooks/useChatbot";
import { cn } from "@/lib/utils";

// ── Chat bubble (single message) ────────────────────────

function ChatBubble({
  message,
  onAction,
}: {
  message: ChatMessage;
  onAction: (action: ChatAction) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full gap-2", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {/* Message content — render bold markers */}
        <div className="whitespace-pre-wrap">
          {message.content.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={i} className="font-semibold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>

        {/* Inline product cards */}
        {message.products && message.products.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.products.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  onAction({
                    type: "view_product",
                    label: p.name,
                    productId: p.id,
                    url: `/products/${p.id}`,
                  })
                }
                className="flex w-full items-center gap-2 rounded-lg border bg-background/60 p-2 text-left transition-colors hover:bg-background"
              >
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.price != null ? `€${p.price}` : "Price on request"}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => onAction(action)}
                className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading dots ────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

// ── Main widget ─────────────────────────────────────────

export default function ChatbotWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    messages,
    isOpen,
    setIsOpen,
    isLoading,
    isEnabled,
    error,
    sendMessage,
    resetConversation,
  } = useChatbot();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleAction = (action: ChatAction) => {
    if (action.url) {
      navigate(action.url);
      setIsOpen(false);
    }
  };

  const suggestedPrompts: string[] = (
    t("chatbot.suggestedPrompts", { returnObjects: true }) as string[]
  ) ?? [];

  if (!isEnabled) return null;

  // ── Closed state: floating button ─────────────────────
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label={t("chatbot.title")}
        >
          <MessageCircle className="h-6 w-6" />
          {/* Pulse ring */}
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" style={{ animationDuration: "3s" }} />
          {/* AI badge */}
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-amber-900 shadow">
            AI
          </span>
        </button>
        {/* Tooltip on hover */}
        <div className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-foreground/90 px-3 py-1.5 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
          {t("chatbot.title")}
        </div>
      </div>
    );
  }

  // ── Open state: chat panel ────────────────────────────
  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
        // Desktop
        "bottom-6 right-6 h-[520px] w-[380px]",
        // Mobile: full screen
        "max-md:inset-0 max-md:h-full max-md:w-full max-md:rounded-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">{t("chatbot.title")}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={resetConversation}
            className="rounded-full p-1.5 transition-colors hover:bg-primary-foreground/20"
            aria-label={t("chatbot.resetConversation")}
            title={t("chatbot.resetConversation")}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1.5 transition-colors hover:bg-primary-foreground/20"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* Suggested prompts when empty */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {t("chatbot.placeholder")}
            </p>
            <div className="flex w-full flex-col gap-2">
              {Array.isArray(suggestedPrompts) &&
                suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput("");
                      sendMessage(prompt);
                    }}
                    className="rounded-xl border bg-muted/50 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {prompt}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} onAction={handleAction} />
        ))}

        {/* Typing indicator */}
        {isLoading && <TypingIndicator />}

        {/* Error */}
        {error && (
          <p className="text-center text-xs text-destructive">{t("chatbot.error")}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer */}
      <div className="border-t px-4 py-1.5">
        <p className="text-center text-[10px] text-muted-foreground">
          {t("chatbot.disclaimer")}
        </p>
      </div>

      {/* Input area */}
      <div className="border-t p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chatbot.placeholder")}
            className="flex-1 rounded-full border bg-muted/50 px-4 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
