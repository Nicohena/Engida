import { useEffect, useState } from "react";
import { CalendarCheck, CreditCard, MessageSquare, XCircle, Tag, Bell } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { api } from "../lib/api";
import type { Notification } from "../types";

const ICONS: Record<Notification["type"], any> = {
  BOOKING_CONFIRMED: CalendarCheck,
  PAYMENT_SUCCESSFUL: CreditCard,
  HOST_REPLIED: MessageSquare,
  BOOKING_CANCELLED: XCircle,
  PROMOTION: Tag,
};

const COLORS: Record<Notification["type"], string> = {
  BOOKING_CONFIRMED: "bg-emerald-100 text-emerald-600",
  PAYMENT_SUCCESSFUL: "bg-primary/10 text-primary",
  HOST_REPLIED: "bg-blue-100 text-blue-600",
  BOOKING_CANCELLED: "bg-red-100 text-red-600",
  PROMOTION: "bg-accent/15 text-accent",
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.getNotifications().then(setNotifications).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: number) {
    await api.markNotificationRead(id);
    load();
  }

  async function markAllRead() {
    await api.markAllNotificationsRead();
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <Button variant="outline" size="sm" onClick={markAllRead}>Mark all as read</Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : notifications.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">
          <Bell className="mx-auto mb-2 text-slate-300" size={32} />
          You're all caught up.
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = ICONS[n.type];
            return (
              <Card
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`flex cursor-pointer items-start gap-3 p-4 transition hover:shadow-md ${
                  !n.isRead ? "border-l-4 border-l-primary" : ""
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${COLORS[n.type]}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{n.title}</p>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>
                </div>
                {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
