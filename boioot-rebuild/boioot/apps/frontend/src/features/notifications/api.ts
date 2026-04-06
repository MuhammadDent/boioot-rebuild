import { api } from "@/lib/api";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  createdAt: string;
}

export interface NotificationListResult {
  items: NotificationItem[];
  total: number;
  unread: number;
}

export const notificationsApi = {
  getList(page = 1, pageSize = 20): Promise<NotificationListResult> {
    return api.get(`/notifications?page=${page}&pageSize=${pageSize}`);
  },

  getUnreadCount(): Promise<{ total: number }> {
    return api.get("/notifications/unread-count");
  },

  markRead(id: string): Promise<void> {
    return api.post(`/notifications/${id}/read`, {});
  },

  markAllRead(): Promise<void> {
    return api.post("/notifications/read-all", {});
  },
};
