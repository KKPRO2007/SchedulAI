import { fmtHour, HOURS, type Session, type Timetable } from './scheduler';

const DAY_INDEX: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5 };

/** Monday of the current week (local time); on a weekend, the coming week. */
export function weekStart(offsetWeeks = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  const weekend = dow >= 5 ? 7 : 0;
  d.setDate(d.getDate() - dow + weekend + offsetWeeks * 7);
  return d;
}

export function dateOf(day: string, base = weekStart()) {
  const d = new Date(base);
  d.setDate(d.getDate() + (DAY_INDEX[day] ?? 0));
  return d;
}

function download(name: string, data: BlobPart, type: string) {
  const blob = new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'timetable';

/** Excel workbook: one grid sheet per group (section / faculty / room) plus a flat list. */
export async function downloadExcel(tt: Timetable, opts: { groupBy?: 'section' | 'faculty' | 'room'; only?: string[]; fileName?: string } = {}) {
  const XLSX = await import('xlsx');
  const groupBy = opts.groupBy ?? 'section';
  const wb = XLSX.utils.book_new();
  const groups = (opts.only ?? [...new Set(tt.sessions.map((s) => s[groupBy]))]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const used = new Set<string>();

  for (const g of groups) {
    const list = tt.sessions.filter((s) => s[groupBy] === g);
    const rows: string[][] = [[`${groupBy === 'section' ? 'Section' : groupBy === 'faculty' ? 'Faculty' : 'Room'}: ${g}`], [], ['Time', ...tt.days]];
    for (const h of HOURS) {
      rows.push([
        `${fmtHour(h)} – ${fmtHour(h + 1)}`,
        ...tt.days.map((d) => {
          const s = list.find((x) => x.day === d && h >= x.start && h < x.start + x.duration);
          if (!s) return h === 13 ? 'Lunch' : '';
          const other = groupBy === 'faculty' ? s.section : s.faculty;
          return `${s.subjectName} (${s.subjectCode})${s.isLab ? ' · Lab' : ''}\n${other}\n${groupBy === 'room' ? s.section : s.room}`;
        }),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, ...tt.days.map(() => ({ wch: 32 }))];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: tt.days.length } }];
    let name = g.replace(/[[\]*?/\\:]/g, '').slice(0, 31) || 'Sheet';
    while (used.has(name)) name = `${name.slice(0, 28)}_${used.size}`;
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const flat = [['Day', 'Date', 'Start', 'End', 'Section', 'Shift', 'Department', 'Subject code', 'Subject', 'Type', 'Faculty', 'Faculty email', 'Room']];
  tt.sessions
    .filter((s) => groups.includes(s[groupBy]))
    .forEach((s) =>
      flat.push([s.day, dateOf(s.day).toLocaleDateString(), fmtHour(s.start), fmtHour(s.start + s.duration), s.section, s.shift, s.department, s.subjectCode, s.subjectName, s.isLab ? 'Lab' : 'Lecture', s.faculty, s.facultyEmail, s.room])
    );
  const ws = XLSX.utils.aoa_to_sheet(flat);
  ws['!cols'] = flat[0].map((h) => ({ wch: Math.max(10, h.length + 4) }));
  XLSX.utils.book_append_sheet(wb, ws, 'All sessions');
  XLSX.writeFile(wb, opts.fileName ?? 'SchedulAI-timetable.xlsx');
}

export function downloadCsv(sessions: Session[], name: string) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [['Day', 'Start', 'End', 'Section', 'Subject code', 'Subject', 'Type', 'Faculty', 'Room']];
  sessions.forEach((s) => rows.push([s.day, fmtHour(s.start), fmtHour(s.start + s.duration), s.section, s.subjectCode, s.subjectName, s.isLab ? 'Lab' : 'Lecture', s.faculty, s.room]));
  download(`${slug(name)}.csv`, '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}

/** iCalendar file with each class repeating weekly for a semester (16 weeks). */
export function downloadIcs(sessions: Session[], name: string, weeks = 16) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SchedulAI//Timetable//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(name)}`];
  for (const s of sessions) {
    const start = dateOf(s.day);
    start.setHours(s.start, 0, 0, 0);
    const end = new Date(start);
    end.setHours(s.start + s.duration);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}-${slug(name)}@schedulai.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${local(start)}`,
      `DTEND:${local(end)}`,
      `RRULE:FREQ=WEEKLY;COUNT=${weeks}`,
      `SUMMARY:${esc(`${s.subjectName}${s.isLab ? ' (Lab)' : ''} · ${s.section}`)}`,
      `LOCATION:${esc(s.room)}`,
      `DESCRIPTION:${esc(`${s.subjectCode} · ${s.faculty} · ${s.section}`)}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  download(`${slug(name)}.ics`, lines.join('\r\n'), 'text/calendar;charset=utf-8');
}

/** Opens the browser print dialog for the element marked .print-area (Save as PDF works). */
export function printTimetable(title: string) {
  const prev = document.title;
  document.title = title;
  document.body.classList.add('printing-timetable');
  window.print();
  document.body.classList.remove('printing-timetable');
  document.title = prev;
}
