
import { useEffect, useState } from 'react';
import { api } from './lib/api';

import FacultyPage from './components/dashboard/FacultyPage';
import RoomsPage from "./components/dashboard/RoomsPage";
import TimetablePage from './components/dashboard/TimetablePage';
import SectionsPage from './components/dashboard/SectionsPage';
import SubjectsPage from './components/dashboard/SubjectsPage' ;


import {
  LayoutDashboard,
  CalendarDays,
  Users,
  DoorOpen,
  GraduationCap,
  BookOpen,
  Settings,
  Bell,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Menu,
} from 'lucide-react';

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Timetable', icon: CalendarDays },
  { label: 'Faculty', icon: Users },
  { label: 'Rooms & Labs', icon: DoorOpen },
  { label: 'Sections', icon: GraduationCap },
  { label: 'Subjects', icon: BookOpen },
];



const sessions = [
  {
    time: '08:00 AM',
    subject: 'Data Structures & Algorithms',
    detail: 'CSE · Section A · Room 204',
    color: 'bg-indigo-500',
  },
  {
    time: '10:00 AM',
    subject: 'Database Management Systems',
    detail: 'CSE · Section B · Lab 02',
    color: 'bg-sky-500',
  },
  {
    time: '12:00 PM',
    subject: 'Operating Systems',
    detail: 'CSE · Section A · Room 108',
    color: 'bg-violet-500',
  },
];

function DashboardContent({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) 
{
  const [counts, setCounts] = useState<{
    faculty: number;
    rooms: number;
    sections: number;
    subjects: number;
  } | null>(null);

  useEffect(() => {
    api.get<NonNullable<typeof counts>>('/stats').then(setCounts).catch(() => setCounts(null));
  }, []);

  const show = (n?: number) => (counts && n !== undefined ? String(n) : '—');

  const stats = [
    { label: 'Total Faculty', value: show(counts?.faculty), note: 'Registered faculty members', icon: Users },
    { label: 'Rooms & Labs', value: show(counts?.rooms), note: 'Classrooms and laboratories', icon: DoorOpen },
    { label: 'Sections', value: show(counts?.sections), note: 'Student groups', icon: GraduationCap },
    { label: 'Subjects', value: show(counts?.subjects), note: 'Subjects to schedule', icon: BookOpen },
  ];



  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            ACADEMIC MANAGEMENT
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Good morning, Admin 👋
          </h3>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Here&apos;s what&apos;s happening across your campus today.
          </p>
        </div>

        <button
          onClick={() => onNavigate('Timetable')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
        >
          <Plus size={18} />
          View timetable
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                  <Icon size={20} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-bold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {stat.note}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold">Today&apos;s schedule</h4>
              <p className="mt-1 text-sm text-slate-500">
                A quick look at today&apos;s academic sessions
              </p>
            </div>
            <Clock size={20} className="text-slate-400" />
          </div>

          <div className="mt-6 space-y-4">
            {sessions.map((session) => (
              <div
                key={session.subject}
                className="flex gap-4 rounded-xl border border-slate-100 p-4"
              >
                <div className="w-1 shrink-0 rounded-full bg-indigo-500" />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-indigo-600">
                    {session.time}
                  </p>
                  <p className="mt-1 font-semibold">
                    {session.subject}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {session.detail}
                  </p>
                </div>

                <div
                  className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white sm:flex ${session.color}`}
                >
                  <BookOpen size={17} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h4 className="font-bold">Scheduling health</h4>
          <p className="mt-1 text-sm text-slate-500">
            Current timetable status
          </p>

          <div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
            <CheckCircle2
              size={22}
              className="shrink-0 text-emerald-600"
            />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Timetable generated
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Sample dashboard status
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={18} />
              <p className="text-sm font-semibold">
                3 conflicts to review
              </p>
            </div>

            <p className="mt-2 text-xs leading-5 text-amber-700">
              Check room availability and faculty assignments before
              publishing the timetable.
            </p>

            <button
              onClick={() => onNavigate('Timetable')}
              className="mt-3 text-sm font-semibold text-amber-800 underline underline-offset-4"
            >
              Review timetable
            </button>
          </div>
        </div>
      </section>

      <p className="pb-2 text-center text-xs text-slate-400">
        SchedulAI · Academic scheduling workspace
      </p>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState('Overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function navigateTo(page: string) {
    setActivePage(page);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                SchedulAI
              </h1>
              <p className="text-xs text-slate-500">
                Academic workspace
              </p>
            </div>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.label;

                return (
                  <button
                    key={item.label}
                    onClick={() => navigateTo(item.label)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={19} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-slate-100 p-4">
            <button
              onClick={() => navigateTo('Settings')}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                activePage === 'Settings'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings size={19} />
              Settings
            </button>

            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                AD
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  Admin User
                </p>
                <p className="text-xs text-slate-500">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu size={22} />
              </button>

              <div>
                <h2 className="text-lg font-bold sm:text-xl">
                  {activePage}
                </h2>
                <p className="hidden text-sm text-slate-500 sm:block">
                  Manage your academic operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
                <Search size={17} className="text-slate-400" />
                <input
                  placeholder="Search anything..."
                  className="w-36 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500">
                  /
                </kbd>
              </div>

              <button
                aria-label="Notifications"
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
              >
                <Bell size={19} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
              </button>

              <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 sm:flex">
                AD
              </div>
            </div>
          </header>

          {/* Conditional page rendering */}
          <div className="mx-auto max-w-7xl p-4 sm:p-8">
            {activePage === 'Faculty' && <FacultyPage />}
{activePage === 'Rooms & Labs' && <RoomsPage />}
{activePage === 'Timetable' && <TimetablePage />}
{activePage === 'Sections' && <SectionsPage />}
{activePage === 'Subjects' && <SubjectsPage />}
{activePage === 'Settings' && (
  <p className="text-slate-500">Settings coming soon.</p>
)}
{activePage === 'Overview' && <DashboardContent onNavigate={navigateTo} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
