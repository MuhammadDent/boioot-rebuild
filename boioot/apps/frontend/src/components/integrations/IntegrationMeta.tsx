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

  const gtm = integrations.find((i) => i.key === "google-tag-manager");
  const gtmId = gtm?.config.containerId;
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

  if (nodes.length === 0) return null;
  return <>{nodes}</>;
}
