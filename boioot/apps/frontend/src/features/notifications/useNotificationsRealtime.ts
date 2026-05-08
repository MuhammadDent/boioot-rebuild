"use client";

import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { tokenStorage } from "@/lib/token";
import type { NotificationItem } from "./api";

interface UseNotificationsRealtimeOptions {
  enabled: boolean;
  onNotification: (notification: NotificationItem) => void;
  onRecover: () => void;
}

// /hubs/* is proxied by Next.js rewrites → backend (same as /api/*).
// This keeps SignalR on the same origin as the frontend so it works
// identically in dev (localhost:3000 → localhost:8080) and production
// (https://www.boioot.net → Fly.io backend).
const NOTIFICATIONS_HUB_URL = "/hubs/notifications";

export function useNotificationsRealtime({
  enabled,
  onNotification,
  onRecover,
}: UseNotificationsRealtimeOptions): void {
  useEffect(() => {
    if (!enabled || !tokenStorage.getToken()) return;

    let disposed = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(NOTIFICATIONS_HUB_URL, {
        accessTokenFactory: () => tokenStorage.getToken() ?? "",
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on("NotificationCreated", (notification: NotificationItem) => {
      onNotification(notification);
    });

    connection.onreconnected(() => {
      if (!disposed) onRecover();
    });

    connection
      .start()
      .then(() => {
        if (!disposed) onRecover();
      })
      .catch((err: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[SignalR] Failed to connect to notifications hub:", err);
        }
      });

    return () => {
      disposed = true;
      connection.stop().catch(() => {});
    };
  }, [enabled, onNotification, onRecover]);
}