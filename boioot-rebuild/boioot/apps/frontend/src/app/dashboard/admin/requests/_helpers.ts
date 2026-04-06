import type { RequestResponse } from "@/types";
import { REQUEST_STATUS_LABELS } from "@/features/dashboard/requests/constants";
import type {
  EnrichedRequest, BaseFilters, IsolationState,
  DistributionEntry, FilterOptions,
} from "./_types";

// ─── Extraction from propertyTitle ────────────────────────────────────────────
const PROP_TYPES = ["شقة", "فيلا", "مكتب", "أرض", "محل", "استوديو", "دوبلكس", "منزل", "مخزن", "عمارة"];

export function extractCity(title: string): string {
  const m = title.match(/[—–-]\s*([^—–-]+)$/);
  return m ? m[1].trim() : "غير محدد";
}

export function extractDistrict(title: string): string {
  // "في DISTRICT —" pattern
  const m = title.match(/في\s+([^—–\-]+?)(?:\s*[—–-]|$)/);
  return m ? m[1].trim() : "غير محدد";
}

export function extractPropType(title: string): string {
  for (const t of PROP_TYPES) {
    if (title.startsWith(t)) return t;
  }
  return "أخرى";
}

export function extractRooms(title: string): string {
  const m = title.match(/(\d+)\s+غرف/);
  if (m) return `${m[1]} غرفة`;
  if (/غرفة واحدة|1\s*غرفة/.test(title)) return "1 غرفة";
  return "بدون تحديد";
}

// ─── Enrichment ───────────────────────────────────────────────────────────────
export function enrichRequest(r: RequestResponse): EnrichedRequest {
  const title = r.propertyTitle ?? "";
  return {
    ...r,
    _city:     title ? extractCity(title)     : "—",
    _district: title ? extractDistrict(title) : "—",
    _propType: title ? extractPropType(title) : "—",
    _rooms:    title ? extractRooms(title)    : "—",
  };
}

// ─── Base filters ─────────────────────────────────────────────────────────────
export function applyBaseFilters(
  requests: EnrichedRequest[],
  f: BaseFilters,
): EnrichedRequest[] {
  let list = requests;

  const q = f.search.trim().toLowerCase();
  if (q) {
    list = list.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.message?.toLowerCase().includes(q) ||
      r.propertyTitle?.toLowerCase().includes(q) ||
      r.projectTitle?.toLowerCase().includes(q) ||
      r.companyName?.toLowerCase().includes(q)
    );
  }

  if (f.status && f.status !== "all") list = list.filter(r => r.status === f.status);
  if (f.city)     list = list.filter(r => r._city     === f.city);
  if (f.district) list = list.filter(r => r._district === f.district);
  if (f.propType) list = list.filter(r => r._propType === f.propType);
  if (f.rooms)    list = list.filter(r => r._rooms    === f.rooms);
  if (f.company)  list = list.filter(r => r.companyName === f.company);

  return list;
}

// ─── Analytics isolation ──────────────────────────────────────────────────────
export function applyIsolation(
  requests: EnrichedRequest[],
  isolation: IsolationState,
): EnrichedRequest[] {
  let list = requests;
  for (const [key, value] of Object.entries(isolation)) {
    switch (key) {
      case "city":     list = list.filter(r => r._city     === value); break;
      case "district": list = list.filter(r => r._district === value); break;
      case "propType": list = list.filter(r => r._propType === value); break;
      case "rooms":    list = list.filter(r => r._rooms    === value); break;
      case "status":   list = list.filter(r => r.status    === value); break;
      case "company":  list = list.filter(r => r.companyName === value); break;
    }
  }
  return list;
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
export function sortRequests(requests: EnrichedRequest[], sortBy: string): EnrichedRequest[] {
  const list = [...requests];
  list.sort((a, b) => {
    switch (sortBy) {
      case "oldest":    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name-asc":  return a.name.localeCompare(b.name, "ar");
      case "name-desc": return b.name.localeCompare(a.name, "ar");
      default:          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  return list;
}

// ─── Distribution computation ─────────────────────────────────────────────────
export function computeDistribution(
  requests: EnrichedRequest[],
  groupBy: string,
): DistributionEntry[] {
  const counts: Record<string, number> = {};

  for (const r of requests) {
    let rawValue: string;
    switch (groupBy) {
      case "city":     rawValue = r._city;                              break;
      case "district": rawValue = r._district;                          break;
      case "propType": rawValue = r._propType;                          break;
      case "rooms":    rawValue = r._rooms;                             break;
      case "status":   rawValue = r.status;                             break;
      case "company":  rawValue = r.companyName || "غير مرتبط";        break;
      default:         rawValue = r.status;
    }
    counts[rawValue] = (counts[rawValue] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([rawValue, count]) => ({
      rawValue,
      displayLabel: groupBy === "status"
        ? (REQUEST_STATUS_LABELS[rawValue] ?? rawValue)
        : rawValue,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Filter options from enriched data ───────────────────────────────────────
function uniqueSorted(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  values.forEach(v => {
    const trimmed = v?.trim() ?? "";
    if (!trimmed || trimmed === "—" || trimmed === "غير محدد" || trimmed === "بدون تحديد") return;
    if (!seen.has(trimmed)) { seen.add(trimmed); unique.push(trimmed); }
  });
  return unique.sort((a, b) => a.localeCompare(b, "ar"));
}

export function buildFilterOptions(requests: EnrichedRequest[]): FilterOptions {
  return {
    cities:    uniqueSorted(requests.map(r => r._city)),
    districts: uniqueSorted(requests.map(r => r._district)),
    propTypes: uniqueSorted(requests.map(r => r._propType)),
    rooms:     uniqueSorted(requests.map(r => r._rooms)),
    companies: uniqueSorted(requests.filter(r => !!r.companyName).map(r => r.companyName!)),
  };
}
