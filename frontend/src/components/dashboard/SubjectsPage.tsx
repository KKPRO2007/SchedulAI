import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../../lib/api";

import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Clock,
  Layers,
} from "lucide-react";

type Subject = {
  id: number;
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  weeklyHours: number;
};



const emptyForm = {
  code: "",
  name: "",
  department: "CSE",
  semester: "5",
  credits: "3",
  weeklyHours: "3",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api
      .get<Subject[]>("/subjects")
      .then(setSubjects)
      .catch(() => setLoadError("Could not load subjects. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return subjects.filter((subject) => {
      const searchableText = [
        subject.code,
        subject.name,
        subject.department,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [subjects, search]);

  const departmentCount = new Set(
    subjects.map((subject) => subject.department)
  ).size;

  const totalWeeklyHours = subjects.reduce(
    (total, subject) => total + subject.weeklyHours,
    0
  );

   function openEdit(subject: Subject) {
    setForm({
      code: subject.code,
      name: subject.name,
      department: subject.department,
      semester: String(subject.semester),
      credits: String(subject.credits),
      weeklyHours: String(subject.weeklyHours),
    });
    setEditingId(subject.id);
    setError("");
    setShowForm(true);
  }

  async function handleSaveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const semester = Number(form.semester);
    const credits = Number(form.credits);
    const weeklyHours = Number(form.weeklyHours);

    if (!code || !name) {
      setError("Please enter the subject code and name.");
      return;
    }

    if (
      !Number.isInteger(semester) ||
      semester < 1 ||
      semester > 8 ||
      !Number.isInteger(credits) ||
      credits < 1 ||
      credits > 10 ||
      !Number.isInteger(weeklyHours) ||
      weeklyHours < 1 ||
      weeklyHours > 20
    ) {
      setError("Semester must be 1–8, credits 1–10, and weekly hours 1–20.");
      return;
    }

    const payload = {
      code,
      name,
      department: form.department,
      semester,
      credits,
      weeklyHours,
    };

    try {
      if (editingId !== null) {
        const updated = await api.put<Subject>(`/subjects/${editingId}`, payload);
        setSubjects((current) =>
          current.map((subject) => (subject.id === editingId ? updated : subject))
        );
      } else {
        const created = await api.post<Subject>("/subjects", payload);
        setSubjects((current) => [...current, created]);
      }

      setForm({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the subject.");
    }
  }

  async function deleteSubject(id: number) {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;

    try {
      await api.delete(`/subjects/${id}`);
      setSubjects((current) => current.filter((subject) => subject.id !== id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete the subject.");
    }
  }

  function closeForm() {
    setShowForm(false);
    setError("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">Dashboard / Subjects</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Subjects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage subjects and their teaching requirements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm({ ...emptyForm });
            setEditingId(null);
            setError("");
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add Subject
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Subjects"
          value={subjects.length}
          icon={<BookOpen size={21} />}
        />
        <StatCard
          title="Departments"
          value={departmentCount}
          icon={<Layers size={21} />}
        />
        <StatCard
          title="Weekly Teaching Hours"
          value={totalWeeklyHours}
          icon={<Clock size={21} />}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="space-y-4 p-4">
          {(loading || loadError) && (
          <p className="px-4 pt-4 text-sm text-slate-500">
            {loading ? "Loading subjects..." : loadError}
          </p>
        )}
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subjects, codes, departments..."
              aria-label="Search subjects"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Subject</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Semester</th>
                <th className="px-5 py-4">Credits</th>
                <th className="px-5 py-4">Weekly Hours</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">
                      {subject.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {subject.code}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
                      {subject.department}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {subject.semester}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {subject.credits}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {subject.weeklyHours} hrs
                  </td>

                                    <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(subject)}
                        aria-label={"Edit " + subject.name}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSubject(subject.id)}
                        aria-label={"Delete " + subject.name}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSubjects.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No subjects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subject-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2
                  id="add-subject-title"
                  className="text-xl font-bold text-slate-900"
                >
                  {editingId !== null ? "Edit Subject" : "Add Subject"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the subject details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

              <form onSubmit={handleSaveSubject} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Subject Code">
                  <input
                    required
                    value={form.code}
                    onChange={(event) =>
                      setForm({ ...form, code: event.target.value })
                    }
                    placeholder="e.g. CS401"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Subject Name">
                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="e.g. Machine Learning"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Department">
                  <select
                    value={form.department}
                    onChange={(event) =>
                      setForm({ ...form, department: event.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                  </select>
                </FormField>

                <FormField label="Semester (1–8)">
                  <input
                    required
                    type="number"
                    min="1"
                    max="8"
                    step="1"
                    value={form.semester}
                    onChange={(event) =>
                      setForm({ ...form, semester: event.target.value })
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Credits (1–10)">
                  <input
                    required
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={form.credits}
                    onChange={(event) =>
                      setForm({ ...form, credits: event.target.value })
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Weekly Hours (1–20)">
                  <input
                    required
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={form.weeklyHours}
                    onChange={(event) =>
                      setForm({ ...form, weeklyHours: event.target.value })
                    }
                    className={inputClass}
                  />
                </FormField>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}