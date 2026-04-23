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

  const nodes: JSX.Element[] = [];

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

  const ga = integrations.find((i) => i.key === "google-analytics");
  const gaId = ga?.config.measurementId;
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

  if (nodes.length === 0) return null;
  return <>{nodes}</>;
}
