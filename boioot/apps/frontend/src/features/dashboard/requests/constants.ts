/** Arabic labels for each RequestStatus enum value. */
export const REQUEST_STATUS_LABELS: Record<string, string> = {
  New:       "جديد",
  Contacted: "تم التواصل",
  Qualified: "مؤهّل",
  Closed:    "مغلق",
};

/** CSS badge class for each RequestStatus enum value. */
export const REQUEST_STATUS_BADGE: Record<string, string> = {
  New:       "badge badge-blue",
  Contacted: "badge badge-yellow",
  Qualified: "badge badge-green",
  Closed:    "badge badge-gray",
};

/** Ordered list of all valid status values — drives the status dropdown. */
export const REQUEST_STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Qualified",
  "Closed",
] as const;

export type RequestStatusValue = (typeof REQUEST_STATUS_OPTIONS)[number];
