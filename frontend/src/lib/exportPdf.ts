import type { jsPDF as JsPDF } from 'jspdf';
import { fmtHour, type Session, type Timetable } from './scheduler';
import { SUBJECT_COLORS } from './timetableStyle';
import { weekStart } from './exportTimetable';

type GroupBy = 'section' | 'faculty' | 'room';
type RGB = [number, number, number];

const PAGE_W = 297;
const PAGE_H = 210;
const M = 12; // page margin (mm)
const INK: RGB = [17, 24, 39];
const MUTED: RGB = [100, 112, 130];
const LINE: RGB = [170, 178, 190];
const NAVY: RGB = [31, 67, 121];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const tint = (c: RGB, k: number): RGB => c.map((v) => Math.round(v * k + 255 * (1 - k))) as RGB;
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'timetable';
const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Cuts text with an ellipsis so it fits the given width at the current font size. */
function fit(doc: JsPDF, text: string, width: number) {
  if (doc.getTextWidth(text) <= width) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + '…') > width) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

/**
 * Downloads a printable A4-landscape PDF laid out like a school timetable:
 * one page per section / teacher / room, days down the side, periods across the top,
 * a lunch column, a subject key and signature lines.
 */
export async function downloadPdf(tt: Timetable, opts: PdfOptions) {
  const { doc, groups } = await buildPdf(tt, opts);
  const name = opts.fileName ?? `${groups.length === 1 ? groups[0] : `all-${opts.groupBy === 'faculty' ? 'faculty' : opts.groupBy + 's'}`}-timetable.pdf`;
  doc.save(name.endsWith('.pdf') ? name : `${slug(name)}.pdf`);
}

export type PdfOptions = { groupBy: GroupBy; only?: string[]; versionLabel?: string; fileName?: string };

/** Builds the PDF document without saving it. */
export async function buildPdf(tt: Timetable, opts: PdfOptions) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const groups = (opts.only ?? [...new Set(tt.sessions.map((s) => s[opts.groupBy]))]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const effective = fmtDate(weekStart());
  const generated = fmtDate(new Date());

  groups.forEach((g, i) => {
    if (i > 0) doc.addPage();
    drawPage(doc, tt, opts.groupBy, g, { effective, generated, version: opts.versionLabel });
  });

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${p} of ${total}`, PAGE_W / 2, PAGE_H - 8.5, { align: 'center' });
  }

  return { doc, groups };
}

function drawPage(doc: JsPDF, tt: Timetable, groupBy: GroupBy, group: string, meta: { effective: string; generated: string; version?: string }) {
  const list = tt.sessions.filter((s) => s[groupBy] === group);

  /* Frame */
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.rect(6, 6, PAGE_W - 12, PAGE_H - 12);
  doc.setLineWidth(0.2);
  doc.rect(7.4, 7.4, PAGE_W - 14.8, PAGE_H - 14.8);

  /* Heading */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('SchedulAI', M + 2, 15.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Academic timetable', M + 2, 19);
  if (meta.version) doc.text(fit(doc, meta.version, 70), PAGE_W - M - 2, 15.5, { align: 'right' });
  doc.text(`Effective from ${meta.effective}`, PAGE_W - M - 2, 19, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text('WEEKLY TIME TABLE', PAGE_W / 2, 18, { align: 'center' });
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.line(PAGE_W / 2 - 36, 20.5, PAGE_W / 2 + 36, 20.5);

  /* Info strip */
  const first = list[0];
  const hours = list.reduce((a, s) => a + s.duration, 0);
  const info: [string, string][] =
    groupBy === 'section'
      ? [['Class / Section', group], ['Department', first?.department ?? '—'], ['Shift', first?.shift ?? '—'], ['Teaching hours / week', `${hours}`]]
      : groupBy === 'faculty'
        ? [['Teacher', group], ['Department', first?.department ?? '—'], ['Sections taught', [...new Set(list.map((s) => s.section))].join(', ') || '—'], ['Teaching hours / week', `${hours}`]]
        : [['Room', group], ['Sections using room', `${new Set(list.map((s) => s.section)).size}`], ['Teachers', `${new Set(list.map((s) => s.faculty)).size}`], ['Hours booked / week', `${hours}`]];
  const infoY = 25;
  const infoW = (PAGE_W - 2 * M) / info.length;
  doc.setLineWidth(0.2);
  doc.setDrawColor(...LINE);
  info.forEach(([label, value], k) => {
    const x = M + k * infoW;
    doc.setFillColor(246, 247, 250);
    doc.rect(x, infoY, infoW, 10.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 2.5, infoY + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(fit(doc, value, infoW - 5), x + 2.5, infoY + 8.6);
  });

  /* Periods: every hour from the first to the last class, lunch (1 PM) shown as a narrow column */
  const used = new Set<number>();
  list.forEach((s) => {
    for (let h = s.start; h < s.start + s.duration; h++) used.add(h);
  });
  const lo = used.size ? Math.min(...used) : 9;
  const hi = used.size ? Math.max(...used) : 16;
  const cols = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
  const isLunch = (h: number) => h === 13 && !used.has(13);

  /* Subject key (drawn later, but its height decides the grid's height) */
  const key = new Map<string, { name: string; color: number; lab: boolean; hours: number; who: Set<string> }>();
  list.forEach((s) => {
    const k = key.get(s.subjectCode) ?? { name: s.subjectName, color: s.color, lab: s.isLab, hours: 0, who: new Set<string>() };
    k.hours += s.duration;
    k.who.add(groupBy === 'faculty' ? s.section : groupBy === 'room' ? `${s.faculty} (${s.section})` : s.faculty);
    key.set(s.subjectCode, k);
  });
  const keyRows = [...key.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const twoCol = keyRows.length > 7;
  const keyLines = twoCol ? Math.ceil(keyRows.length / 2) : keyRows.length;
  const KEY_ROW = 4.6;
  const keyH = 5.5 + Math.max(1, keyLines) * KEY_ROW;

  const footerTop = PAGE_H - 26;
  const gridTop = infoY + 14;
  const gridBottom = footerTop - keyH - 6;
  const HEAD_H = 11;
  const dayW = 24;
  const lunchW = 9;
  const nLunch = cols.filter(isLunch).length;
  const periodW = (PAGE_W - 2 * M - dayW - nLunch * lunchW) / (cols.length - nLunch);
  const rowH = Math.min(19, (gridBottom - gridTop - HEAD_H) / tt.days.length);

  const colX: number[] = [];
  let cx = M + dayW;
  cols.forEach((h) => {
    colX.push(cx);
    cx += isLunch(h) ? lunchW : periodW;
  });
  const colW = (k: number) => (isLunch(cols[k]) ? lunchW : periodW);

  /* Header row */
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.25);
  doc.setFillColor(...NAVY);
  doc.rect(M, gridTop, dayW, HEAD_H, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DAY / TIME', M + dayW / 2, gridTop + HEAD_H / 2 + 1.2, { align: 'center' });
  let period = 0;
  cols.forEach((h, k) => {
    const x = colX[k];
    const w = colW(k);
    doc.setFillColor(...NAVY);
    doc.rect(x, gridTop, w, HEAD_H, 'FD');
    if (isLunch(h)) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`PERIOD ${ROMAN[period++] ?? period}`, x + w / 2, gridTop + 4.6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(`${fmtHour(h)} – ${fmtHour(h + 1)}`, x + w / 2, gridTop + 8.6, { align: 'center' });
  });

  /* Day rows */
  tt.days.forEach((day, r) => {
    const y = gridTop + HEAD_H + r * rowH;
    doc.setDrawColor(...INK);
    doc.setFillColor(240, 243, 248);
    doc.rect(M, y, dayW, rowH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(day.toUpperCase(), M + dayW / 2, y + rowH / 2 + 1.3, { align: 'center' });

    for (let k = 0; k < cols.length; k++) {
      const h = cols[k];
      if (isLunch(h)) continue;
      const s = list.find((x) => x.day === day && x.start === h);
      const inside = list.some((x) => x.day === day && h > x.start && h < x.start + x.duration);
      if (inside) continue;
      if (!s) {
        doc.setDrawColor(...LINE);
        doc.rect(colX[k], y, colW(k), rowH);
        continue;
      }
      // a lab spans the following period column(s)
      let w = 0;
      for (let j = k; j < cols.length && cols[j] < s.start + s.duration; j++) w += colW(j);
      drawSession(doc, s, groupBy, colX[k], y, w, rowH);
    }
  });

  /* Lunch column */
  cols.forEach((h, k) => {
    if (!isLunch(h)) return;
    const y = gridTop + HEAD_H;
    const hgt = rowH * tt.days.length;
    doc.setDrawColor(...INK);
    doc.setFillColor(234, 237, 242);
    doc.rect(colX[k], y, lunchW, hgt, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    // rotated text ignores align, so centre it by hand: it runs upward from its anchor
    const label = 'L U N C H   B R E A K';
    doc.text(label, colX[k] + lunchW / 2 + 1.1, y + hgt / 2 + doc.getTextWidth(label) / 2, { angle: 90 });
  });

  /* Outer grid border */
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.5);
  doc.rect(M, gridTop, PAGE_W - 2 * M, HEAD_H + rowH * tt.days.length);

  /* Subject key */
  const keyTop = gridTop + HEAD_H + rowH * tt.days.length + 5;
  const keyCols = twoCol ? 2 : 1;
  const blockW = (PAGE_W - 2 * M - (keyCols - 1) * 6) / keyCols;
  const whoLabel = groupBy === 'section' ? 'Teacher' : groupBy === 'faculty' ? 'Section(s)' : 'Teacher (section)';
  for (let c = 0; c < keyCols; c++) {
    const x0 = M + c * (blockW + 6);
    const rows = keyRows.slice(c * keyLines, (c + 1) * keyLines);
    const widths = [blockW * 0.13, blockW * 0.37, blockW * 0.34, blockW * 0.16];
    const heads = ['Code', 'Subject', whoLabel, 'Hrs / week'];
    doc.setFillColor(...NAVY);
    doc.setDrawColor(...NAVY);
    doc.rect(x0, keyTop, blockW, 5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    let hx = x0;
    heads.forEach((t, j) => {
      doc.text(t, hx + 2, keyTop + 3.5);
      hx += widths[j];
    });
    rows.forEach(([code, k], r) => {
      const y = keyTop + 5 + r * KEY_ROW;
      if (r % 2 === 1) {
        doc.setFillColor(246, 247, 250);
        doc.rect(x0, y, blockW, KEY_ROW, 'F');
      }
      const c0 = hex(SUBJECT_COLORS[k.color % SUBJECT_COLORS.length]);
      doc.setFillColor(...c0);
      doc.rect(x0 + 0.8, y + 1.1, 1.4, KEY_ROW - 2.2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...INK);
      let tx = x0;
      [`${code}`, `${k.name}${k.lab && !/\blab\b/i.test(k.name) ? ' (Lab)' : ''}`, [...k.who].join(', '), `${k.hours}`].forEach((t, j) => {
        doc.setFont('helvetica', j === 0 ? 'bold' : 'normal');
        doc.text(fit(doc, t, widths[j] - 4), tx + (j === 0 ? 3.2 : 2), y + 3.2);
        tx += widths[j];
      });
    });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.rect(x0, keyTop, blockW, 5 + Math.max(1, rows.length) * KEY_ROW);
  }

  /* Footer: generated line and signatures */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`Generated by SchedulAI on ${meta.generated}. Clash-free: every class, teacher and room checked.`, M + 2, PAGE_H - 13.5);
  const sigs = ['Timetable Coordinator', 'Head of Department'];
  sigs.forEach((label, k) => {
    const x = PAGE_W - M - 2 - (sigs.length - k) * 52 + 6;
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.25);
    doc.line(x, PAGE_H - 17, x + 44, PAGE_H - 17);
    doc.setTextColor(...INK);
    doc.text(label, x + 22, PAGE_H - 13.5, { align: 'center' });
  });
}

function drawSession(doc: JsPDF, s: Session, groupBy: GroupBy, x: number, y: number, w: number, h: number) {
  const c = hex(SUBJECT_COLORS[s.color % SUBJECT_COLORS.length]);
  doc.setFillColor(...tint(c, 0.13));
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, 'FD');
  doc.setFillColor(...c);
  doc.rect(x, y, 1.3, h, 'F');

  const pad = 2.6;
  const inner = w - pad - 1.6;
  const cxm = x + 1.3 + (w - 1.3) / 2;
  const other = groupBy === 'faculty' ? s.section : s.faculty;
  const place = groupBy === 'room' ? s.section : s.room;
  const big = h >= 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(big ? 9.5 : 8.5);
  doc.setTextColor(...INK);
  doc.text(fit(doc, `${s.subjectCode}${s.isLab ? '  (LAB)' : ''}`, inner), cxm, y + (big ? 5.2 : 4.4), { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.text(fit(doc, s.subjectName, inner), cxm, y + (big ? 9 : 7.6), { align: 'center' });

  doc.setFontSize(6.2);
  doc.setTextColor(...MUTED);
  doc.text(fit(doc, `${other} · ${place}`, inner), cxm, y + h - 2.2, { align: 'center' });
}
