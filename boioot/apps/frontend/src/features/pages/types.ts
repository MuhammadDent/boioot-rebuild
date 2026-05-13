export interface StaticPagePublic {
  slug:               string;
  titleAr:            string;
  contentAr:          string | null;
  metaDescriptionAr:  string | null;
}

export interface FooterLink {
  slug:          string;
  titleAr:       string;
  footerSection: string | null;
  sortOrder:     number;
}

export interface StaticPageAdmin {
  id:                string;
  slug:              string;
  titleAr:           string;
  contentAr:         string | null;
  metaDescriptionAr: string | null;
  isActive:          boolean;
  showInFooter:      boolean;
  footerSection:     string | null;
  sortOrder:         number;
  isSystem:          boolean;
  createdAt:         string;
  updatedAt:         string;
}

export interface UpsertStaticPagePayload {
  slug:              string;
  titleAr:           string;
  contentAr:         string | null;
  metaDescriptionAr: string | null;
  isActive:          boolean;
  showInFooter:      boolean;
  footerSection:     string | null;
  sortOrder:         number;
}
