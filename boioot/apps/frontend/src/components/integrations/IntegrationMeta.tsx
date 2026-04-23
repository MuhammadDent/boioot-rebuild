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

export default async function IntegrationMeta(): Promise<JSX.Element | null> {
  const integrations = await fetchActiveIntegrations();

  const gsc = integrations.find((i) => i.key === "google-search-console");
  if (!gsc) return null;

  const raw = gsc.config.verificationCode;
  if (!raw) return null;

  const content = raw.startsWith("google-site-verification=")
    ? raw.replace("google-site-verification=", "")
    : raw;

  if (!content) return null;

  return <meta name="google-site-verification" content={content} />;
}
