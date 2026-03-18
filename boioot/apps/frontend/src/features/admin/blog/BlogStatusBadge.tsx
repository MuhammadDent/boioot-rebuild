import { BLOG_STATUS_BADGE, BLOG_STATUS_LABELS } from "@/features/admin/constants";
import type { BlogPostStatus } from "@/types";

export function BlogStatusBadge({ status }: { status: BlogPostStatus }) {
  return (
    <span className={BLOG_STATUS_BADGE[status] ?? "badge badge-gray"}>
      {BLOG_STATUS_LABELS[status] ?? status}
    </span>
  );
}
