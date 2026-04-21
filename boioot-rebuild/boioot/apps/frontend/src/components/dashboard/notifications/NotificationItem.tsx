"use client";

import type { KeyboardEvent } from "react";
import type { NotificationItem as NotificationModel } from "@/features/notifications/api";
import {
  fullNotificationDate,
  getNotificationActionLabel,
  getNotificationTypeConfig,
  relativeNotificationTime,
} from "./notificationTypeConfig";

interface NotificationItemProps {
  notification: NotificationModel;
  variant: "dropdown" | "page";
  isHovered: boolean;
  isLast?: boolean;
  onHover: (id: string | null) => void;
  onClick: (notification: NotificationModel) => void;
}

function DecisionBadge({ type }: { type: string }) {
  const badge = getNotificationTypeConfig(type).badge;
  if (!badge) return null;

  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 700,
        color: badge.color,
        background: badge.bg,
        borderRadius: "999px",
        padding: "1px 7px",
        whiteSpace: "nowrap",
        marginTop: "3px",
        alignSelf: "flex-start",
        display: "inline-block",
      }}
    >
      {badge.label}
    </span>
  );
}

export default function NotificationItem({
  notification,
  variant,
  isHovered,
  isLast = false,
  onHover,
  onClick,
}: NotificationItemProps) {
  const config = getNotificationTypeConfig(notification.type);
  const actionLabel = getNotificationActionLabel(notification);
  const isDropdown = variant === "dropdown";

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(notification);
    }
  };

  const content = (
    <>
      <span
        style={isDropdown
          ? { fontSize: "18px", flexShrink: 0, lineHeight: 1.4 }
          : { fontSize: "22px", flexShrink: 0, lineHeight: 1.3, marginTop: "2px" }}
      >
        {config.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: isDropdown ? "13px" : "14px",
            fontWeight: notification.isRead ? 400 : 700,
            color: "#111827",
            lineHeight: 1.4,
          }}
        >
          {notification.title}
        </p>
        <p
          style={isDropdown
            ? {
                margin: "2px 0 0",
                fontSize: "12px",
                color: "#6b7280",
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }
            : {
                margin: "4px 0 0",
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: 1.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
              }}
        >
          {notification.body}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isDropdown ? "6px" : "8px",
            marginTop: isDropdown ? "4px" : "6px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "11px", color: "#9ca3af" }}>
            {isDropdown
              ? relativeNotificationTime(notification.createdAt)
              : `${relativeNotificationTime(notification.createdAt)} · ${fullNotificationDate(notification.createdAt)}`}
          </span>
          <DecisionBadge type={notification.type} />
          {actionLabel && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#1d4ed8",
                background: "#dbeafe",
                borderRadius: "999px",
                padding: "1px 7px",
                cursor: "pointer",
              }}
            >
              {actionLabel} ›
            </span>
          )}
        </div>
      </div>
      {!notification.isRead && (
        <span
          style={isDropdown
            ? { width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", flexShrink: 0, marginTop: "5px" }
            : { width: "9px", height: "9px", borderRadius: "50%", background: "#16a34a", flexShrink: 0, marginTop: "4px" }}
        />
      )}
    </>
  );

  const sharedProps = {
    role: "button",
    tabIndex: 0,
    onMouseEnter: () => onHover(notification.id),
    onMouseLeave: () => onHover(null),
    onClick: () => onClick(notification),
    onKeyDown: handleKeyDown,
  };

  if (isDropdown) {
    return (
      <li
        {...sharedProps}
        style={{
          display: "flex",
          gap: "10px",
          padding: "12px 16px",
          background: isHovered ? (notification.isRead ? "#f9fafb" : "#dcfce7") : (notification.isRead ? "#fff" : "#f0fdf4"),
          borderBottom: "1px solid #f3f4f6",
          cursor: "pointer",
          transition: "background 0.12s",
          userSelect: "none",
        }}
      >
        {content}
      </li>
    );
  }

  return (
    <div
      {...sharedProps}
      style={{
        display: "flex",
        gap: "14px",
        padding: "16px 20px",
        background: isHovered ? (notification.isRead ? "#f9fafb" : "#dcfce7") : (notification.isRead ? "#fff" : "#f0fdf4"),
        borderBottom: isLast ? "none" : "1px solid #f3f4f6",
        cursor: "pointer",
        transition: "background 0.12s",
        userSelect: "none",
      }}
    >
      {content}
    </div>
  );
}
