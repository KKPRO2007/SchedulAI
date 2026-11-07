import { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRoute, navigate } from './lib/router';
import { useSession } from './lib/auth';
import type { Role } from './lib/demoAccounts';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import { homeFor, navFor, type PageId } from './components/layout/nav';
import Scene3D from './components/three/Scene3D';
import { Toaster } from './components/ui/toast';

const Overview = lazy(() => import('./components/dashboard/Overview'));
const MySchedule = lazy(() => import('./components/dashboard/MySchedule'));
const StudentTimetable = lazy(() => import('./components/dashboard/StudentTimetable'));
const TimetablePage = lazy(() => import('./components/dashboard/TimetablePage'));
const StudioPage = lazy(() => import('./components/workflow/StudioPage'));
const VersionsPage = lazy(() => import('./components/workflow/VersionsPage'));
const RequestsPage = lazy(() => import('./components/workflow/RequestsPage'));
const AuditPage = lazy(() => import('./components/workflow/AuditPage'));
const EntityPage = lazy(() => import('./components/dashboard/EntityPage'));
const ImportPage = lazy(() => import('./components/import/ImportPage'));
const SettingsPage = lazy(() => import('./components/dashboard/SettingsPage'));

function Workspace({ page, role }: { page: PageId; role: Role }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canEdit = role === 'admin' || role === 'coordinator';

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  return (
    <div className="relative flex min-h-screen">
      <Scene3D variant="app" />
      <Sidebar active={page} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="min-w-0 flex-1">
        <Topbar active={page} onMenu={() => setMenuOpen(true)} />
        <div className="mx-auto max-w-[1400px] p-4 sm:p-8">
          <Suspense
            fallback={
              <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin text-violet-300" size={30} />
              </div>
            }
          >
            <div key={page}>
              {page === 'overview' && <Overview />}
              {page === 'schedule' && <MySchedule />}
              {page === 'my-timetable' && <StudentTimetable />}
              {page === 'import' && <ImportPage />}
              {page === 'studio' && <StudioPage />}
              {page === 'versions' && <VersionsPage />}
              {page === 'timetable' && <TimetablePage />}
              {page === 'requests' && <RequestsPage />}
              {page === 'audit' && <AuditPage />}
              {(page === 'faculty' || page === 'rooms' || page === 'sections' || page === 'subjects') && <EntityPage key={page} entity={page} readOnly={!canEdit} />}
              {page === 'settings' && <SettingsPage />}
            </div>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const session = useSession();
  const [path, query = ''] = route.split('?');
  const role = session?.user.role ?? 'student';

  let view: React.ReactNode;
  if (path.startsWith('/app')) {
    const id = path.split('/')[2] as PageId;
    const allowed = navFor(role).some((n) => n.id === id);
    if (!session) view = <Redirect to="/login" />;
    else if (!allowed) view = <Redirect to={`/app/${homeFor(role)}`} />;
    else view = <Workspace page={id} role={role} />;
  } else if (path === '/login') {
    view = session ? <Redirect to={`/app/${homeFor(role)}`} /> : <Login key={query} preset={new URLSearchParams(query).get('as')} />;
  } else {
    view = <Landing />;
  }

  return (
    <>
      {view}
      <Toaster />
    </>
  );
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to), [to]);
  return null;
}
