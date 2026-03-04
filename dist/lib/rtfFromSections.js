"use strict";
/**
 * המרת סעיפים (כותרת + גוף) ל-RTF אחד – כותרות מודגשות (bold, גודל גדול) לתצוגה ב-UI.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.plainFromSections = plainFromSections;
exports.rtfFromSections = rtfFromSections;
const RTF_HEADING_SIZE = 24; // half-points → 12pt
const RTF_BODY_SIZE = 18; // half-points → 9pt
function escapeRtf(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\n/g, '\\par\n');
}
/** סימון כותרת בטקסט הפשוט – ה־iOS יזהה ויציג ככותרת (גדול, מודגש). */
const HEADING_PREFIX = '## ';
/** טקסט פשוט מסעיפים – כותרות עם "## " כדי שה־UI יציגן ככותרות אמיתיות. */
function plainFromSections(sections) {
    return sections
        .map((sec) => {
        const parts = [];
        if (sec.heading && sec.heading.trim())
            parts.push(HEADING_PREFIX + sec.heading.trim());
        if (sec.body && sec.body.trim())
            parts.push(sec.body.trim());
        return parts.join('\n\n');
    })
        .filter(Boolean)
        .join('\n\n');
}
/** בונה מחרוזת RTF מסעיפים – כותרת ב-bold וגודל גדול, גוף רגיל. */
function rtfFromSections(sections) {
    const parts = [
        '{\\rtf1\\ansi\\ansicpg1255\\deff0',
        '{\\fonttbl{\\f0\\fnil\\fcharset177 System;}}',
        '\\rtlpar\\qr', // RTL, right align
    ];
    for (const sec of sections) {
        if (sec.heading && sec.heading.trim()) {
            parts.push('\\b\\fs' + RTF_HEADING_SIZE + ' ');
            parts.push(escapeRtf(sec.heading.trim()));
            parts.push('\\b0\\fs' + RTF_BODY_SIZE + '\\par\n');
        }
        if (sec.body && sec.body.trim()) {
            parts.push('\\fs' + RTF_BODY_SIZE + ' ');
            parts.push(escapeRtf(sec.body.trim()));
            parts.push('\\par\n');
        }
    }
    parts.push('}');
    return parts.join('');
}
