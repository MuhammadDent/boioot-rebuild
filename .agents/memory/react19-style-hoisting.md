---
name: React 19 style tag hoisting hydration bug
description: Inline <style> tags in client components cause hydration errors in React 19 / Next.js 16 even without precedence prop.
---

## Rule
Never place bare `<style>` tags inside client component render trees in React 19 + Next.js 16. React 19 gives `<style>` tags special treatment during hydration — server renders them inline in body, but the client reconciler treats them differently, causing a structural mismatch → hydration error.

**Why:** React 19 handles `<style>`, `<link>`, and `<script>` tags as "resource" elements. Even without a `precedence` prop, the reconciler's handling of these elements differs between SSR (renders inline) and client hydration (resource-tracking logic), causing a DOM mismatch.

**How to apply:**
- Move any `@keyframes` or other CSS from inline `<style>` tags to `globals.css` or a CSS module.
- If an inline style is truly needed and cannot be moved to a CSS file, use `dangerouslySetInnerHTML={{ __html: '...' }}` on the `<style>` element to opt out of React's resource tracking.
- Check for `<style>` tags in components that render during SSR (not gated by `mounted` or `useEffect`).

**Root cause in Boioot:** `HomePageClient.tsx` had `<style>{`@keyframes spin { ... }`}</style>` unconditionally at the bottom of its return. The animation was already defined in `globals.css` line 403 and `components.css` line 275 — the inline tag was redundant AND causing the hydration error.
