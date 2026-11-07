
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

import {
  Search,
  Plus,
  Users,
  Mail,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

type FacultyMember = {
  id: number;
  name: string;
  email: string;
  department: string;
  available: boolean;
};



function FacultyPage() {
    const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api
      .get<FacultyMember[]>('/faculty')
      .then(setFaculty)
      .catch(() => setLoadError('Could not load faculty. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);


  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');

  const filteredFaculty = faculty.filter((member) => {
    const query = search.toLowerCase();

    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.department.toLowerCase().includes(query)
    );
  });

    

    async function addFaculty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const created = await api.post<FacultyMember>('/faculty', {
        name: name.trim(),
        email: email.trim(),
        department,
      });

      setFaculty((current) => [...current, created]);
      setName('');
      setEmail('');
      setDepartment('');
      setFormError('');
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
    }
  }

  async function deleteFaculty(id: number) {
    if (!window.confirm('Are you sure you want to delete this faculty member?')) return;

    try {
      await api.delete(`/faculty/${id}`);
      setFaculty((current) => current.filter((member) => member.id !== id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete.');
    }
  }


  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            PEOPLE MANAGEMENT
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight">
            Faculty
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Manage faculty members and their availability.
          </p>
        </div>

        <button
        
          onClick={() => {
            setFormError('');
            setShowForm(true);
          }}

          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add Faculty
        </button>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total Faculty</p>
            <Users size={20} className="text-indigo-600" />
          </div>
          <p className="mt-3 text-3xl font-bold">{faculty.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Available</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {faculty.filter((member) => member.available).length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Departments</p>
          <p className="mt-3 text-3xl font-bold">
            {new Set(faculty.map((member) => member.department)).size}
          </p>
        </div>
      </section>

      {/* Search and table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h4 className="font-bold">Faculty directory</h4>
            <p className="mt-1 text-sm text-slate-500">
                {loading
                ? 'Loading faculty...'
                : loadError || `${filteredFaculty.length} members shown`}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search faculty..."
              className="w-full bg-transparent text-sm outline-none sm:w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Faculty member</th>
                <th className="px-5 py-4 font-semibold">Department</th>
                <th className="px-5 py-4 font-semibold">Availability</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredFaculty.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-semibold text-indigo-700">
                        {member.name
                          .split(' ')
                          .slice(-2)
                          .map((part) => part[0])
                          .join('')}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {member.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Mail size={12} />
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {member.department}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                        member.available
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {member.available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        title="Edit coming soon"
                        aria-label={`Edit ${member.name}`}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteFaculty(member.id)}
                        aria-label={`Delete ${member.name}`}
                        className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredFaculty.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No faculty members found. Try another search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add faculty modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xl font-bold">Add faculty member</h4>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the faculty member&apos;s details.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addFaculty} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Full name
                </label>
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Dr. Neha Sharma"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email address
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="faculty@college.edu"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Department
                </label>
                <select
                  required
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select department</option>
                  <option>Computer Science</option>
                  <option>Information Technology</option>
                  <option>Mathematics</option>
                  <option>Physics</option>
                  <option>Electronics</option>
                </select>
              </div>

              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Add faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacultyPage;
