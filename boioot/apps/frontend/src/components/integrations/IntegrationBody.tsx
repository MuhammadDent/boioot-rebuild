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

export default async function IntegrationBody(): Promise<JSX.Element | null> {
  const integrations = await fetchActiveIntegrations();

  const nodes: JSX.Element[] = [];

  // ── Google Tag Manager noscript ────────────────────────────────────────────
  // Use dangerouslySetInnerHTML instead of React children: browsers with JS
  // enabled parse <noscript> content as raw text, not DOM elements, which
  // causes a React hydration mismatch if children are React elements.
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
      <noscript
        key="gtm-noscript"
        dangerouslySetInnerHTML={{
          __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        }}
      />
    );
  }

  // ── Meta Pixel noscript ────────────────────────────────────────────────────
  const meta = integrations.find((i) => i.key === "meta-pixel");
  const metaPixelId = meta?.config.pixelId;
  if (metaPixelId) {
    nodes.push(
      <noscript
        key="meta-pixel-noscript"
        dangerouslySetInnerHTML={{
          __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1" alt="" />`,
        }}
      />
    );
  }

  if (nodes.length === 0) return null;
  return <>{nodes}</>;
}
