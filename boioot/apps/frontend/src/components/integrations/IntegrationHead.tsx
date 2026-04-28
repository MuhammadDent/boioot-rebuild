import type { JSX } from "react";

type ActiveIntegration = {
  key: string;
  config: Record<string, string>;
};

async function fetchActiveIntegrations(): Promise<ActiveIntegration[]> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const res = await fetch(`${backendUrl}/api/integrations/active`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as ActiveIntegration[];
  } catch {
    return [];
  }
}

export default async function IntegrationHead(): Promise<JSX.Element | null> {
  const integrations = await fetchActiveIntegrations();

  const nodes: JSX.Element[] = [];

  // ── Google Search Console ──────────────────────────────────────────────────
  const gsc = integrations.find((i) => i.key === "google-search-console");
  if (gsc?.config.verificationCode) {
    const raw = gsc.config.verificationCode;
    const content = raw.startsWith("google-site-verification=")
      ? raw.replace("google-site-verification=", "")
      : raw;
    if (content) {
      nodes.push(
        <meta key="gsc" name="google-site-verification" content={content} />
      );
    }
  }

  // ── Google Analytics ───────────────────────────────────────────────────────
  const ga = integrations.find((i) => i.key === "google-analytics");
  const gaId = ga?.config.measurementId || process.env.NEXT_PUBLIC_GA_ID;
  if (gaId) {
    nodes.push(
      <script
        key="ga-src"
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
    );
    nodes.push(
      <script
        key="ga-init"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
        }}
      />
    );
  }

  // ── Google Tag Manager ─────────────────────────────────────────────────────
  const gtmApi = integrations.find((i) => i.key === "google-tag-manager");
  const gtmId =
    (gtmApi?.config.containerId &&
    gtmApi.config.containerId.startsWith("GTM-")
      ? gtmApi.config.containerId
      : null) ??
    process.env.NEXT_PUBLIC_GTM_ID ??
    null;

  if (gtmId && gtmId.startsWith("GTM-")) {
    nodes.push(
      <script
        key="gtm-init"
        dangerouslySetInnerHTML={{
          __html:
            `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':` +
            `new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],` +
            `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;` +
            `j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;` +
            `f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
        }}
      />
    );
  }

  // ── Meta Pixel ─────────────────────────────────────────────────────────────
  const meta = integrations.find((i) => i.key === "meta-pixel");
  const metaPixelId = meta?.config.pixelId;
  if (metaPixelId) {
    nodes.push(
      <script
        key="meta-pixel-init"
        dangerouslySetInnerHTML={{
          __html:
            `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){` +
            `n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};` +
            `if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];` +
            `t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];` +
            `s.parentNode.insertBefore(t,s)}(window,document,'script',` +
            `'https://connect.facebook.net/en_US/fbevents.js');` +
            `fbq('init','${metaPixelId}');fbq('track','PageView');`,
        }}
      />
    );
  }

  // ── TikTok Pixel ───────────────────────────────────────────────────────────
  const tiktok = integrations.find((i) => i.key === "tiktok-pixel");
  const rawTiktokId = tiktok?.config.pixelId ?? "";
  // TikTok pixel IDs are alphanumeric strings, typically 15–25 chars.
  // Skip invalid IDs to prevent the "Invalid pixel ID" console warning.
  const tiktokPixelId = /^[A-Za-z0-9]{10,30}$/.test(rawTiktokId) ? rawTiktokId : "";
  if (tiktokPixelId) {
    nodes.push(
      <script
        key="tiktok-pixel-init"
        dangerouslySetInnerHTML={{
          __html:
            `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];` +
            `ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];` +
            `ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};` +
            `for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);` +
            `ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};` +
            `ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";` +
            `ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};` +
            `ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};` +
            `var o=d.createElement("script");o.type="text/javascript";o.async=!0;` +
            `o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];` +
            `a.parentNode.insertBefore(o,a)};` +
            `ttq.load('${tiktokPixelId}');ttq.page();}(window,document,'ttq');`,
        }}
      />
    );
  }

  // ── Snapchat Pixel ─────────────────────────────────────────────────────────
  const snap = integrations.find((i) => i.key === "snapchat-pixel");
  const snapPixelId = snap?.config.pixelId;
  if (snapPixelId) {
    nodes.push(
      <script
        key="snapchat-pixel-init"
        dangerouslySetInnerHTML={{
          __html:
            `(function(e,t,n){if(e.snaptr)return;` +
            `var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};` +
            `a.queue=[];var s='script',r=t.createElement(s);r.async=!0;r.src=n;` +
            `var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);}` +
            `)(window,document,'https://sc-static.net/scevent.min.js');` +
            `snaptr('init','${snapPixelId}',{});snaptr('track','PAGE_VIEW');`,
        }}
      />
    );
  }

  if (nodes.length === 0) return null;
  return <>{nodes}</>;
}
