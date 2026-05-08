"use client";

import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { apiConfig } from "@/lib/api-config";
import { tokenStorage } from "@/lib/token";
import type { NotificationItem } from "./api";

interface UseNotificationsRealtimeOptions {
  enabled: boolean;
  onNotification: (notification: NotificationItem) => void;
  onRecover: () => void;
}

function getNotificationsHubUrl(): string {
  // NEXT_PUBLIC_SIGNALR_URL must be the backend ORIGIN (e.g. https://boioot-api.fly.dev).
  // SignalR WebSocket upgrades cannot be routed through Next.js HTTP rewrites,
  // so this must point directly to the backend — never to the Vercel/frontend origin.
  if (apiConfig.signalrBaseUrl) {
    return `${apiConfig.signalrBaseUrl.replace(/\/$/, "")}/hubs/notifications`;
  }
  // Fallback for environments where NEXT_PUBLIC_SIGNALR_URL is not set.
  // Strips the /api suffix from the base URL to get the backend origin.
  const baseUrl = apiConfig.baseUrl.replace(/\/api\/?$/, "");
  return `${baseUrl}/hubs/notifications`;
}

export function useNotificationsRealtime({
  enabled,
  onNotification,
  onRecover,
}: UseNotificationsRealtimeOptions): void {
  useEffect(() => {
    if (!enabled || !tokenStorage.getToken()) return;

    let disposed = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getNotificationsHubUrl(), {
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