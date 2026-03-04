/** User-saved template: name + content only. */
export interface ContractTemplate {
  id: string;
  userId: string;
  name: string;
  templateDescription: string;
  vendorType: string | null;
  sectionContents: string[];
  createdAt: string;
}

/** Shared default template (seed; one per vendor type). */
export interface DefaultTemplate {
  id: string;
  name: string;
  templateDescription: string;
  vendorType: string;
  sectionContents: string[];
  createdAt: string;
}

export interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  template_description: string;
  vendor_type: string | null;
  section_contents: unknown;
  created_at: Date;
}

export interface DefaultTemplateRow {
  id: string;
  name: string;
  template_description: string;
  vendor_type: string;
  section_contents: unknown;
  created_at: Date;
}

export function rowToTemplate(row: TemplateRow): ContractTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    templateDescription: row.template_description || '',
    vendorType: row.vendor_type,
    sectionContents: Array.isArray(row.section_contents) ? row.section_contents : [],
    createdAt: row.created_at.toISOString(),
  };
}

export function rowToDefaultTemplate(row: DefaultTemplateRow): DefaultTemplate {
  return {
    id: row.id,
    name: row.name,
    templateDescription: row.template_description || '',
    vendorType: row.vendor_type,
    sectionContents: Array.isArray(row.section_contents) ? row.section_contents : [],
    createdAt: row.created_at.toISOString(),
  };
}
