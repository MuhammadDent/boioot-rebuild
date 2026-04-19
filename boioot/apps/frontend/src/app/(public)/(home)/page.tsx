import HomePageClient from "./HomePageClient";

const HERO_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=800&q=65&fm=webp";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export default async function HomePage() {
  let initialHeroImage = HERO_IMAGE_FALLBACK;

  try {
    const res = await fetch(`${BACKEND_URL}/api/content/public`, {
      cache: "no-store",
    });
    if (res.ok) {
      const map: Record<string, string> = await res.json();
      initialHeroImage = map["home.hero.image"] ?? HERO_IMAGE_FALLBACK;
    }
  } catch {
    // Network error or backend unavailable — fallback to static URL.
  }

  return <HomePageClient initialHeroImage={initialHeroImage} />;
}
