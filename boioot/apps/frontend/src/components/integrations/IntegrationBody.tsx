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

  const gtm = integrations.find((i) => i.key === "google-tag-manager");
  const gtmId = gtm?.config.containerId;

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
