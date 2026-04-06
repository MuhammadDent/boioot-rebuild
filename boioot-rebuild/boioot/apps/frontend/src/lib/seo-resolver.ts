import type { PublicBlogPostDetail, BlogSeoSettingsDto } from "@/types";

export type SeoMode = "Auto" | "Template" | "Custom";

export interface ResolvedBlogSeo {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
}

const FALLBACK_SITE_NAME = "بيوت";
const FALLBACK_TITLE_SUFFIX = " | بيوت";
const FALLBACK_DESCRIPTION = "اقرأ المزيد في مدونة بيوت العقارية";

function buildVars(
  post: PublicBlogPostDetail,
  settings: BlogSeoSettingsDto
): Record<string, string> {
  const firstCategory = post.categories?.[0]?.name ?? "";
  const publishDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("ar-SY", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return {
    PostTitle: post.title,
    Excerpt: post.excerpt ?? "",
    Category: firstCategory,
    SiteName: settings.siteName || FALLBACK_SITE_NAME,
    AuthorName: "",
    PublishDate: publishDate,
  };
}

export function resolveTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export const SEO_VARIABLES: Array<{ key: string; label: string }> = [
  { key: "{PostTitle}",   label: "عنوان المقال" },
  { key: "{Excerpt}",     label: "الملخص" },
  { key: "{Category}",    label: "التصنيف" },
  { key: "{SiteName}",    label: "اسم الموقع" },
  { key: "{AuthorName}",  label: "اسم الكاتب" },
  { key: "{PublishDate}", label: "تاريخ النشر" },
];

function autoTitle(post: PublicBlogPostDetail, siteName: string): string {
  return `${post.title} | ${siteName || FALLBACK_SITE_NAME}`;
}

function autoDescription(post: PublicBlogPostDetail): string {
  return post.excerpt || FALLBACK_DESCRIPTION;
}

export function resolveBlogSeo(
  post: PublicBlogPostDetail,
  settings: BlogSeoSettingsDto
): ResolvedBlogSeo {
  const vars = buildVars(post, settings);
  const mode = post.seoMode ?? "Auto";

  let metaTitle: string;
  let metaDescription: string;
  let ogTitle: string;
  let ogDescription: string;

  if (mode === "Custom") {
    metaTitle =
      post.seoTitle?.trim() || autoTitle(post, vars.SiteName);
    metaDescription =
      post.seoDescription?.trim() || autoDescription(post);
    ogTitle =
      post.ogTitle?.trim() || metaTitle;
    ogDescription =
      post.ogDescription?.trim() || metaDescription;
  } else if (mode === "Template") {
    const titleTpl =
      settings.defaultPostSeoTitleTemplate || "{PostTitle} | {SiteName}";
    const descTpl =
      settings.defaultPostSeoDescriptionTemplate || "{Excerpt}";
    const ogTitleTpl =
      settings.defaultOgTitleTemplate || "{PostTitle} | {SiteName}";
    const ogDescTpl =
      settings.defaultOgDescriptionTemplate || "{Excerpt}";

    metaTitle =
      resolveTemplate(titleTpl, vars).trim() ||
      autoTitle(post, vars.SiteName);
    metaDescription =
      resolveTemplate(descTpl, vars).trim() || autoDescription(post);
    ogTitle =
      resolveTemplate(ogTitleTpl, vars).trim() ||
      autoTitle(post, vars.SiteName);
    ogDescription =
      resolveTemplate(ogDescTpl, vars).trim() || autoDescription(post);
  } else {
    metaTitle = autoTitle(post, vars.SiteName);
    metaDescription = autoDescription(post);
    ogTitle = metaTitle;
    ogDescription = metaDescription;
  }

  if (!metaTitle) metaTitle = post.title + FALLBACK_TITLE_SUFFIX;
  if (!metaDescription) metaDescription = FALLBACK_DESCRIPTION;
  if (!ogTitle) ogTitle = metaTitle;
  if (!ogDescription) ogDescription = metaDescription;

  return { metaTitle, metaDescription, ogTitle, ogDescription };
}
