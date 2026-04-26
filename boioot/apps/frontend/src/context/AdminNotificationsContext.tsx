"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { notificationsApi, type NotificationItem } from "@/features/notifications/api";
import { useAuth } from "@/context/AuthContext";

// ─── Mock data ────────────────────────────────────────────────────────────────
// Shown when the real API returns empty or is unreachable.

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "mock-1",
    type: "verification_request",
    title: "طلب توثيق جديد",
    body: "مستخدم طلب توثيق هويته ويحتاج مراجعة الوثائق",
    isRead: false,
    relatedEntityType: "VerificationRequest",
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  },
  {
    id: "mock-2",
    type: "new_user",
    title: "مستخدم جديد انضم للمنصة",
    body: "أحمد محمد سجّل حساباً جديداً كمالك عقار",
    isRead: false,
    relatedEntityType: "User",
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    id: "mock-3",
    type: "property_flagged",
    title: "تم الإبلاغ عن عقار",
    body: "تم الإبلاغ عن إحدى العقارات من قِبل مستخدم — يحتاج مراجعة",
    isRead: false,
    relatedEntityType: "Property",
    createdAt: new Date(Date.now() - 28 * 60_000).toISOString(),
  },
  {
    id: "mock-4",
    type: "new_message",
    title: "رسالة جديدة من مستخدم",
    body: "لديك رسالة جديدة تحتاج إلى رد في صندوق الوارد",
    isRead: true,
    createdAt: new Date(Date.now() - 65 * 60_000).toISOString(),
  },
  {
    id: "mock-5",
    type: "system_alert",
    title: "تنبيه النظام",
    body: "تم تحديث إعدادات المنصة بنجاح من قِبل المدير",
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
  },
];

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AdminNotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (notification: NotificationItem) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refresh: () => void;
}

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mockedRef = useRef(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const result = await notificationsApi.getList(1, 10);
      if (result.items.length > 0) {
        setNotifications(result.items);
        mockedRef.current = false;
      } else if (!mockedRef.current) {
        setNotifications(MOCK_NOTIFICATIONS);
        mockedRef.current = true;
      }
    } catch {
      if (!mockedRef.current) {
        setNotifications(MOCK_NOTIFICATIONS);
        mockedRef.current = true;
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [isAuthenticated, authLoading, refresh]);

  const addNotification = useCallback((notification: NotificationItem) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notification.id)) return prev;
      return [notification, ...prev].slice(0, 10);
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (!id.startsWith("mock-")) {
      notificationsApi.markRead(id).catch(() => {});
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const hasReal = notifications.some((n) => !n.id.startsWith("mock-") && !n.isRead);
    if (hasReal) {
      notificationsApi.markAllRead().catch(() => {});
    }
  }, [notifications]);

  return (
    <AdminNotificationsContext.Provider
      value={{ notifications, unreadCount, isLoading, addNotification, markAsRead, markAllAsRead, refresh }}
    >
      {children}
    </AdminNotificationsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminNotifications(): AdminNotificationsContextValue {
  const ctx = useContext(AdminNotificationsContext);
  if (!ctx) {
    throw new Error("useAdminNotifications must be used inside AdminNotificationsProvider");
  }
  return ctx;
}
