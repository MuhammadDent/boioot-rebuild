"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

type ActiveIntegration = {
  key: string;
  config: Record<string, string>;
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    fbq: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; version?: string; loaded?: boolean; push?: unknown };
    _fbq: Window["fbq"];
    ttq: { load: (id: string) => void; page: () => void; track: (e: string) => void };
    snaptr: (cmd: string, id: string, opts?: unknown) => void;
  }
}

function injectScript(id: string, src: string, onLoad?: () => void) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  if (onLoad) s.onload = onLoad;
  document.head.appendChild(s);
}

function injectInlineScript(id: string, content: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.innerHTML = content;
  document.head.appendChild(s);
}

function injectMeta(name: string, content: string) {
  if (document.querySelector(`meta[name="${name}"]`)) return;
  const m = document.createElement("meta");
  m.name = name;
  m.content = content;
  document.head.appendChild(m);
}

function applyIntegration(integration: ActiveIntegration) {
  const { key, config } = integration;

  switch (key) {
    case "google-analytics": {
      const id = config.measurementId;
      if (!id) return;
      injectScript("ga-script", `https://www.googletagmanager.com/gtag/js?id=${id}`);
      injectInlineScript(
        "ga-init",
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}` +
          `gtag('js',new Date());gtag('config','${id}');`
      );
      break;
    }

    case "meta-pixel": {
      const id = config.pixelId;
      if (!id) return;
      injectInlineScript(
        "meta-pixel-init",
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};` +
          `if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
          `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
          `fbq('init','${id}');fbq('track','PageView');`
      );
      break;
    }

    case "tiktok-pixel": {
      const id = config.pixelId;
      if (!id) return;
      injectInlineScript(
        "tiktok-pixel-init",
        `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];` +
          `ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];` +
          `ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};` +
          `for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);` +
          `ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};` +
          `ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";` +
          `ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};` +
          `ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;` +
          `var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};` +
          `ttq.load('${id}');ttq.page();}(window,document,'ttq');`
      );
      break;
    }

    case "snapchat-pixel": {
      const id = config.pixelId;
      if (!id) return;
      injectInlineScript(
        "snapchat-pixel-init",
        `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};` +
          `a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];` +
          `u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');` +
          `snaptr('init','${id}',{});snaptr('track','PAGE_VIEW');`
      );
      break;
    }

    case "google-search-console": {
      const code = config.verificationCode;
      if (!code) return;
      const content = code.startsWith("google-site-verification=")
        ? code.replace("google-site-verification=", "")
        : code;
      injectMeta("google-site-verification", content);
      break;
    }

    case "microsoft-clarity": {
      const id = config.projectId;
      if (!id) return;
      injectInlineScript(
        "clarity-init",
        `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};` +
          `t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;` +
          `y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`
      );
      break;
    }
  }
}

export default function IntegrationScripts() {
  useEffect(() => {
    api
      .get<ActiveIntegration[]>("/integrations/active")
      .then((integrations) => {
        for (const integration of integrations) {
          try { applyIntegration(integration); }
          catch { /* fail silently per integration */ }
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
