import { useState, useRef, useEffect } from "react";
import {
  Bell,
  MessageSquare,
  ShoppingCart,
  Package,
  Star,
  FileText,
  Info,
  CheckCheck,
  X,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { AppNotification } from "@/hooks/useNotifications";

const TYPE_ICON: Record<string, React.ElementType> = {
  message: MessageSquare,
  quote_reply: FileText,
  cart_reminder: ShoppingCart,
  order_update: Package,
  review_request: Star,
  info: Info,
};

function useTimeAgo(t: (key: string, opts?: Record<string, unknown>) => string) {
  return (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t("notifications.timeAgo.justNow");
    if (mins < 60) return t("notifications.timeAgo.minutes", { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("notifications.timeAgo.hours", { count: hrs });
    const days = Math.floor(hrs / 24);
    return t("notifications.timeAgo.days", { count: days });
  };
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { totalUnread } = useConversations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeAgo = useTimeAgo(t);

  const totalBadge = unreadCount + totalUnread;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const handleNotificationClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.action_url) {
      setOpen(false);
      navigate(n.action_url);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t("notifications.title")}
      >
        <Bell className="h-5 w-5" />
        {totalBadge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-display font-bold">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-sm shadow-lg z-[60] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-sm text-foreground">
              {t("notifications.title")}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" /> {t("notifications.markAllRead")}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages shortcut */}
          {totalUnread > 0 && (
            <Link
              to="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-b border-border hover:bg-blue-100 transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-body text-blue-700">
                {t("notifications.unreadMessages", { count: totalUnread })}
              </span>
            </Link>
          )}

          {/* Notification list */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs font-body text-muted-foreground">
                  {t("notifications.noNotifications")}
                </p>
              </div>
            ) : (
              notifications.slice(0, 15).map((n) => {
                const Icon = TYPE_ICON[n.type] || Info;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-card/50 transition-colors cursor-pointer ${
                      !n.is_read ? "bg-blue-50/50" : ""
                    }`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded-sm ${
                        !n.is_read ? "bg-blue-100" : "bg-foreground/5"
                      }`}
                    >
                      <Icon
                        className={`h-3 w-3 ${
                          !n.is_read ? "text-blue-600" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-body leading-tight ${
                          !n.is_read ? "text-foreground font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-[10px] font-body text-muted-foreground mt-0.5 truncate">
                          {n.message}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] font-body text-muted-foreground whitespace-nowrap mt-0.5">
                      {n.created_at ? timeAgo(n.created_at) : ""}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <Link
            to="/messages"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-[10px] font-display font-semibold text-muted-foreground hover:text-foreground border-t border-border transition-colors"
          >
            {t("notifications.viewAllMessages")}
          </Link>
        </div>
      )}
    </div>
  );
}
