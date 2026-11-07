// Generates the sample files shown in Data Import › Demo files.
// Run: node scripts/make-demo-files.mjs
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const out = path.resolve(import.meta.dirname, '../public/demo');
fs.mkdirSync(out, { recursive: true });

const firsts = ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Meera', 'Arjun', 'Kavya', 'Siddharth', 'Neha', 'Karan', 'Isha', 'Rahul', 'Divya', 'Aditya', 'Pooja', 'Nikhil', 'Sneha', 'Varun', 'Tanvi', 'Manish', 'Ritu'];
const lasts = ['Sharma', 'Verma', 'Iyer', 'Mehta', 'Singh', 'Nair', 'Kapoor', 'Reddy', 'Gupta', 'Joshi', 'Bose', 'Menon', 'Patel', 'Rao', 'Chopra', 'Das', 'Kulkarni', 'Agarwal'];
const person = (i) => [firsts[(i * 5 + 1) % firsts.length], lasts[(i * 7 + 2) % lasts.length]];

function write(name, wb, bookType) {
  fs.writeFileSync(path.join(out, name), XLSX.write(wb, { bookType, type: 'buffer' }));
  console.log('wrote', name);
}
function book(sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa, widths] of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return wb;
}

/* 1. Multi-sheet master workbook with a title banner above the headers */
{
  const staff = [
    ['Greenfield Institute of Technology — Master Data 2026'],
    ['Prepared by Academic Office · Confidential'],
    [],
    ['S.No', 'Teacher Name', 'Mail ID', 'Dept.', 'Designation', 'Status'],
  ];
  // staffed roughly in proportion to each department's weekly teaching load
  const depts = [...Array(10).fill('CSE'), ...Array(5).fill('IT'), ...Array(5).fill('ECE'), ...Array(6).fill('ME'), 'Mathematics', 'Mathematics', 'Physics', 'Physics'];
  const titles = ['Professor', 'Associate Professor', 'Assistant Professor', 'Assistant Professor', 'Lecturer'];
  for (let i = 0; i < depts.length; i++) {
    const [f, l] = person(i);
    const title = titles[i % titles.length];
    staff.push([i + 1, `${title.includes('Professor') ? 'Dr.' : 'Prof.'} ${f} ${l}`, `${f}.${l}${i}@greenfield.edu`.toLowerCase(), depts[i], title, i % 9 === 4 ? 'On leave' : 'Active']);
  }

  const rooms = [['Room No', 'Block', 'Category', 'Seats']];
  for (const b of ['A', 'B', 'C']) {
    for (let fl = 1; fl <= 3; fl++) for (let n = 1; n <= 3; n++) rooms.push([`${b}-${fl}0${n}`, b, 'Lecture', 60 + ((fl * n) % 3) * 6]);
    rooms.push([`${b}-LAB-1`, b, 'Computer Lab', 36], [`${b}-LAB-2`, b, 'Practical Lab', 32]);
  }
  rooms.push(['SH-1', 'Central', 'Seminar Hall', 200], ['SH-2', 'Central', 'Auditorium', 320]);

  const batches = [['Batch', 'Branch', 'Sem', 'Strength', 'Session']];
  for (const [d, sems] of [['CSE', [1, 3, 5, 7]], ['IT', [3, 5]], ['ECE', [3, 5]], ['ME', [3, 5]]]) {
    for (const s of sems) for (const sec of ['A', 'B']) batches.push([`${d}-${s}${sec}`, d, ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][s - 1], 52 + ((s * 3 + sec.charCodeAt(0)) % 14), sec === 'A' ? 'Morning' : 'Evening']);
  }

  const courses = [['Course Code', 'Course Title', 'Branch', 'Semester', 'Credits', 'L-T-P']];
  const catalogue = {
    CSE: { 1: ['Programming in C', 'Engineering Mathematics I', 'Basic Electrical Engineering', 'C Programming Lab'], 3: ['Data Structures', 'Discrete Mathematics', 'Digital Logic Design', 'Object Oriented Programming', 'Data Structures Lab'], 5: ['Operating Systems', 'Database Management Systems', 'Computer Networks', 'Theory of Computation', 'DBMS Lab'], 7: ['Machine Learning', 'Cloud Computing', 'Information Security', 'Project Phase I'] },
    IT: { 3: ['Web Technologies', 'Data Structures', 'Computer Organization', 'Web Lab'], 5: ['Software Engineering', 'Computer Networks', 'Distributed Systems', 'Networks Lab'] },
    ECE: { 3: ['Signals & Systems', 'Electronic Devices', 'Network Theory', 'Devices Lab'], 5: ['Digital Signal Processing', 'Microprocessors', 'Control Systems', 'Microprocessors Lab'] },
    ME: { 3: ['Thermodynamics', 'Strength of Materials', 'Manufacturing Processes', 'Workshop Lab'], 5: ['Heat Transfer', 'Machine Design', 'Fluid Mechanics', 'Fluid Mechanics Lab'] },
  };
  for (const [d, sems] of Object.entries(catalogue)) {
    for (const [s, list] of Object.entries(sems)) {
      list.forEach((name, k) => {
        const lab = /lab|project/i.test(name);
        courses.push([`${d === 'CSE' ? 'CS' : d === 'ECE' ? 'EC' : d}${s}0${k + 1}`, name, d, Number(s), lab ? 2 : k < 2 ? 4 : 3, lab ? '0-0-3' : k < 2 ? '3-1-0' : '3-0-0']);
      });
    }
  }

  write('Campus_Master_Data_2026.xlsx', book([
    ['Teaching Staff', staff, [6, 30, 34, 14, 22, 10]],
    ['Infrastructure', rooms, [12, 10, 16, 8]],
    ['Batches', batches, [12, 10, 8, 10, 10]],
    ['Course Catalogue', courses, [12, 34, 10, 10, 8, 8]],
  ]), 'xlsx');
}

/* 2. A loosely named CSV with different headers and department codes */
{
  const rows = [['Name', 'Email Address', 'Department', 'Position', 'Availability']];
  const d = ['CSE', 'IT', 'ECE', 'EEE', 'Civil', 'MATHS'];
  for (let i = 30; i < 48; i++) {
    const [f, l] = person(i);
    rows.push([`${f} ${l}`, `${f[0]}${l}${i}@greenfield.edu`.toLowerCase(), d[i % d.length], i % 3 ? 'Assistant Professor' : 'Associate Professor', i % 7 === 0 ? 'No' : 'Yes']);
  }
  const csv = rows.map((r) => r.map((c) => (/[",]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
  fs.writeFileSync(path.join(out, 'faculty list final (2).csv'), csv);
  console.log('wrote faculty list final (2).csv');
}

/* 3. OpenDocument spreadsheet of labs & halls, with no "type" column */
{
  const rows = [['Venue', 'Building', 'Seating Capacity', 'Usable?']];
  ['CS Lab 1', 'CS Lab 2', 'AI Research Lab', 'Electronics Lab', 'Physics Lab', 'Seminar Hall 2', 'Lecture Theatre 1', 'Lecture Theatre 2', 'Drawing Hall'].forEach((v, i) =>
    rows.push([v, i < 3 ? 'Tech Tower' : i < 5 ? 'Science Block' : 'Main Building', /lab/i.test(v) ? 30 + (i % 3) * 6 : 120 + i * 10, i === 4 ? 'Under maintenance' : 'Yes'])
  );
  write('Rooms & Labs inventory.ods', book([['Venues', rows, [20, 16, 16, 18]]]), 'ods');
}

/* 4. Mixed allocation sheet: sections + subjects + faculty in one table, department only in the file name */
{
  const rows = [['Section', 'Subject Code', 'Subject Name', 'Faculty', 'Hours/Week', 'Credits']];
  const subjects = [['EC501', 'Digital Signal Processing', 4, 4], ['EC502', 'Microprocessors', 4, 4], ['EC503', 'Analog Communication', 3, 3], ['EC504', 'Control Systems', 3, 3], ['EC505', 'VLSI Design', 3, 3], ['EC506', 'DSP Lab', 2, 2]];
  const teachers = ['Dr. Meera Iyer', 'Dr. Arjun Nair', 'Prof. Kavya Rao', 'Dr. Vikram Bose', 'Prof. Sneha Menon', 'Dr. Rohan Das'];
  ['ECE-5A', 'ECE-5B', 'ECE-5C'].forEach((sec, si) =>
    subjects.forEach(([code, name, h, c], k) => rows.push([sec, code, name, teachers[(k + si) % teachers.length], h, c]))
  );
  write('ECE timetable input - sem 5.xlsx', book([['Allocation', rows, [10, 12, 30, 22, 11, 8]]]), 'xlsx');
}

/* 5. Legacy .xls subjects sheet using "paper" wording */
{
  const rows = [['Paper Code', 'Paper Name', 'Sem', 'Credit', 'Periods per week']];
  [['IT301', 'Web Technologies', 3], ['IT302', 'Computer Organization', 3], ['IT303', 'Probability & Statistics', 3], ['IT304', 'Web Lab', 3], ['IT501', 'Software Engineering', 5], ['IT502', 'Distributed Systems', 5], ['IT503', 'Mobile App Development', 5], ['IT504', 'Mobile Apps Lab', 5]].forEach(([c, n, s]) =>
    rows.push([c, n, `Sem ${s}`, /lab/i.test(n) ? 2 : 3, /lab/i.test(n) ? 2 : 3])
  );
  write('Subjects_IT_2025 (copy).xls', book([['Sheet1', rows]]), 'biff8');
}

/* 6. JSON export from another system: sections with only class name + size */
{
  const data = ['IT-3A', 'IT-3B', 'IT-5A', 'IT-5B', 'CSE-3C', 'ME-5C'].map((c, i) => ({ class: c, students: 48 + i * 3, timing: i % 2 ? 'Evening' : 'Morning' }));
  fs.writeFileSync(path.join(out, 'student_groups_export.json'), JSON.stringify(data, null, 2));
  console.log('wrote student_groups_export.json');
}
