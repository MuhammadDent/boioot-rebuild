"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      dir="rtl"
      richColors
      closeButton
      duration={4000}
    />
  );
}
