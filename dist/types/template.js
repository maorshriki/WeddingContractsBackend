"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToTemplate = rowToTemplate;
exports.rowToDefaultTemplate = rowToDefaultTemplate;
function rowToTemplate(row) {
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
function rowToDefaultTemplate(row) {
    return {
        id: row.id,
        name: row.name,
        templateDescription: row.template_description || '',
        vendorType: row.vendor_type,
        sectionContents: Array.isArray(row.section_contents) ? row.section_contents : [],
        createdAt: row.created_at.toISOString(),
    };
}
