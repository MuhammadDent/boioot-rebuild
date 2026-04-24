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

  // Primary source: backend API.  Fallback: NEXT_PUBLIC_GTM_ID env variable.
  const gtmApi = integrations.find((i) => i.key === "google-tag-manager");
  const gtmId =
    (gtmApi?.config.containerId && gtmApi.config.containerId.startsWith("GTM-")
      ? gtmApi.config.containerId
      : null) ?? process.env.NEXT_PUBLIC_GTM_ID ?? null;

  if (!gtmId || !gtmId.startsWith("GTM-")) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
