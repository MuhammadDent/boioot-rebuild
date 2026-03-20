import type { RequestResponse } from "@/types";

// ─── Enriched request with extracted fields from propertyTitle ─────────────────
export type EnrichedRequest = RequestResponse & {
  _city:     string;
  _district: string;
  _propType: string;
  _rooms:    string;
};

// ─── Global base filters ────────────────────────────────────────────────────────
export interface BaseFilters {
  search:   string;
  status:   string;   // "all" | raw status value e.g. "New"
  city:     string;
  district: string;
  propType: string;
  rooms:    string;
  company:  string;
  sortBy:   string;
}

export const DEFAULT_BASE_FILTERS: BaseFilters = {
  search:   "",
  status:   "all",
  city:     "",
  district: "",
  propType: "",
  rooms:    "",
  company:  "",
  sortBy:   "newest",
};

// ─── Analytics isolation (Record<groupKey, selectedValue>) ─────────────────────
// e.g. { city: "دمشق", propType: "شقة" }
export type IsolationState = Record<string, string>;

// ─── GroupBy options ─────────────────────────────────────────────────────────────
export const GROUP_BY_OPTIONS: { key: string; label: string }[] = [
  { key: "status",   label: "الحالة" },
  { key: "city",     label: "المدينة" },
  { key: "district", label: "الحي" },
  { key: "propType", label: "نوع العقار" },
  { key: "rooms",    label: "عدد الغرف" },
  { key: "company",  label: "الشركة" },
];

export const GROUP_KEY_LABELS: Record<string, string> = {
  status:   "الحالة",
  city:     "المدينة",
  district: "الحي",
  propType: "نوع العقار",
  rooms:    "عدد الغرف",
  company:  "الشركة",
};

// ─── Distribution entry ──────────────────────────────────────────────────────────
export interface DistributionEntry {
  displayLabel: string;   // shown in UI (Arabic label for status, otherwise raw value)
  rawValue:     string;   // stored in IsolationState
  count:        number;
}

// ─── Filter options (unique values available in dataset) ─────────────────────────
export interface FilterOptions {
  cities:    string[];
  districts: string[];
  propTypes: string[];
  rooms:     string[];
  companies: string[];
}
