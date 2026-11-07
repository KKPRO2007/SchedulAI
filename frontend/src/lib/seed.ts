import type { Faculty, Room, Section, Subject } from './types';

// A realistic demo campus: 5 departments, 22 sections, ~45 faculty, ~35 rooms, ~55 subjects.
// Used to seed the offline demo store and by the "Load demo campus" shortcut.

type NoId<T> = Omit<T, 'id'>;

/** The faculty demo login maps to this record. */
export const DEMO_FACULTY_EMAIL = 'faculty@schedulai.app';

const DEPARTMENTS: { code: string; name: string; staff: number; sections: Record<number, string[]> }[] = [
  { code: 'CSE', name: 'Computer Science', staff: 14, sections: { 3: ['A', 'B', 'C'], 5: ['A', 'B', 'C'], 7: ['A', 'B'] } },
  { code: 'IT', name: 'Information Technology', staff: 6, sections: { 3: ['A', 'B'], 5: ['A', 'B'] } },
  { code: 'ECE', name: 'Electronics & Communication', staff: 8, sections: { 3: ['A', 'B'], 5: ['A', 'B'] } },
  { code: 'ME', name: 'Mechanical Engineering', staff: 7, sections: { 3: ['A', 'B'], 5: ['A', 'B'] } },
  { code: 'CE', name: 'Civil Engineering', staff: 5, sections: { 3: ['A'], 5: ['A'] } },
  { code: 'MA', name: 'Mathematics', staff: 3, sections: {} },
  { code: 'PH', name: 'Physics', staff: 2, sections: {} },
];

// [name, credits, weeklyHours]
type S = [string, number, number];
const CURRICULUM: Record<string, Record<number, S[]>> = {
  CSE: {
    3: [['Data Structures', 4, 4], ['Discrete Mathematics', 3, 3], ['Digital Logic Design', 3, 3], ['Object Oriented Programming', 3, 3], ['Data Structures Lab', 2, 2], ['OOP Lab', 2, 2]],
    5: [['Operating Systems', 4, 4], ['Database Management Systems', 4, 4], ['Computer Networks', 3, 3], ['Theory of Computation', 3, 3], ['DBMS Lab', 2, 2], ['Networks Lab', 2, 2]],
    7: [['Machine Learning', 4, 4], ['Cloud Computing', 3, 3], ['Information Security', 3, 3], ['Compiler Design', 3, 3], ['Machine Learning Lab', 2, 2], ['Project Phase I', 2, 2]],
  },
  IT: {
    3: [['Web Technologies', 4, 4], ['Computer Organization', 3, 3], ['Probability & Statistics', 3, 3], ['Data Structures', 3, 3], ['Web Technologies Lab', 2, 2]],
    5: [['Software Engineering', 4, 4], ['Distributed Systems', 3, 3], ['Mobile App Development', 3, 3], ['Computer Networks', 3, 3], ['Mobile Apps Lab', 2, 2]],
  },
  ECE: {
    3: [['Signals & Systems', 4, 4], ['Electronic Devices', 3, 3], ['Network Theory', 3, 3], ['Engineering Mathematics III', 3, 3], ['Electronic Devices Lab', 2, 2]],
    5: [['Digital Signal Processing', 4, 4], ['Microprocessors', 4, 4], ['Analog Communication', 3, 3], ['Control Systems', 3, 3], ['Microprocessors Lab', 2, 2]],
  },
  ME: {
    3: [['Thermodynamics', 4, 4], ['Strength of Materials', 4, 4], ['Manufacturing Processes', 3, 3], ['Engineering Mathematics III', 3, 3], ['Workshop Lab', 2, 2]],
    5: [['Heat Transfer', 4, 4], ['Machine Design', 4, 4], ['Fluid Mechanics', 3, 3], ['Dynamics of Machinery', 3, 3], ['Fluid Mechanics Lab', 2, 2]],
  },
  CE: {
    3: [['Surveying', 4, 4], ['Fluid Mechanics', 3, 3], ['Building Materials', 3, 3], ['Engineering Geology', 3, 3], ['Surveying Lab', 2, 2]],
    5: [['Structural Analysis', 4, 4], ['Geotechnical Engineering', 3, 3], ['Transportation Engineering', 3, 3], ['Environmental Engineering', 3, 3], ['Concrete Lab', 2, 2]],
  },
};

const FIRST = ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Meera', 'Arjun', 'Kavya', 'Siddharth', 'Neha', 'Karan', 'Isha', 'Rahul', 'Divya', 'Aditya', 'Pooja', 'Nikhil', 'Sneha', 'Varun', 'Tanvi', 'Manish', 'Ritu', 'Harsh', 'Swati', 'Amit', 'Lakshmi', 'Gaurav', 'Shreya', 'Deepak', 'Nandini'];
const LAST = ['Sharma', 'Verma', 'Iyer', 'Mehta', 'Singh', 'Nair', 'Kapoor', 'Reddy', 'Gupta', 'Joshi', 'Bose', 'Menon', 'Patel', 'Rao', 'Chopra', 'Das', 'Kulkarni', 'Agarwal', 'Pillai', 'Saxena', 'Malhotra', 'Bhat', 'Sinha', 'Thakur', 'Banerjee', 'Krishnan', 'Mishra', 'Hegde', 'Chauhan', 'Desai'];
const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Assistant Professor', 'Assistant Professor', 'Lecturer'];

export function buildDemoCampus() {
  const faculty: NoId<Faculty>[] = [];
  const sections: NoId<Section>[] = [];
  const subjects: NoId<Subject>[] = [];
  let p = 0;

  for (const dept of DEPARTMENTS) {
    for (let i = 0; i < dept.staff; i++, p++) {
      const first = FIRST[p % FIRST.length];
      const last = LAST[(p * 7 + 3 + Math.floor(p / FIRST.length) * 5) % LAST.length];
      const designation = DESIGNATIONS[i % DESIGNATIONS.length];
      const isDemo = p === 0;
      faculty.push({
        name: isDemo ? 'Dr. Priya Sharma' : `${designation === 'Lecturer' ? 'Prof.' : 'Dr.'} ${first} ${last}`,
        email: isDemo ? DEMO_FACULTY_EMAIL : `${first}.${last}@schedulai.edu`.toLowerCase(),
        department: dept.name,
        designation: isDemo ? 'Associate Professor' : designation,
        available: isDemo || p % 13 !== 7,
      });
    }

    Object.entries(dept.sections).forEach(([semText, letters]) => {
      const sem = Number(semText);
      letters.forEach((letter, li) => {
        sections.push({
          name: `${dept.code}-${sem}${letter}`,
          department: dept.name,
          semester: sem,
          students: 52 + ((sem * 5 + li * 7 + dept.code.length * 3) % 15),
          shift: letter === 'B' ? 'Shift 2' : 'Shift 1',
        });
      });
      (CURRICULUM[dept.code]?.[sem] ?? []).forEach(([name, credits, weeklyHours], k) => {
        subjects.push({ code: `${dept.code}${sem}0${k + 1}`, name, department: dept.name, semester: sem, credits, weeklyHours });
      });
    });
  }

  const rooms: NoId<Room>[] = [];
  ['A', 'B', 'C', 'D'].forEach((block, b) => {
    for (let floor = 1; floor <= 3; floor++) {
      for (let n = 1; n <= 2; n++) {
        rooms.push({ name: `${block}-${floor}0${n}`, building: `Academic Block ${block}`, type: 'Classroom', capacity: [60, 72, 66][(floor + n + b) % 3], available: !(block === 'D' && floor === 3 && n === 2) });
      }
    }
    rooms.push({ name: `${block}-LAB-1`, building: `Academic Block ${block}`, type: 'Laboratory', capacity: 36, available: true });
    rooms.push({ name: `${block}-LAB-2`, building: `Academic Block ${block}`, type: 'Laboratory', capacity: 40, available: true });
  });
  rooms.push({ name: 'SH-1', building: 'Central Auditorium', type: 'Seminar Hall', capacity: 180, available: true });
  rooms.push({ name: 'SH-2', building: 'Library Annexe', type: 'Seminar Hall', capacity: 120, available: true });

  return { faculty, rooms, sections, subjects };
}
