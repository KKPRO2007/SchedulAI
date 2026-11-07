
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

import {
  Search,
  Plus,
  GraduationCap,
  Users,
  BookOpen,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

type Section = {
  id: number;
  name: string;
  department: string;
  semester: number;
  students: number;
  shift: "Shift 1" | "Shift 2";
};

const emptyForm = {
  name: "",
  department: "Computer Science",
  semester: "5",
  students: "60",
  shift: "Shift 1" as Section["shift"],
};

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api
      .get<Section[]>("/sections")
      .then(setSections)
      .catch(() => setLoadError("Could not load sections. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const filteredSections = useMemo(() => {
    const query = search.toLowerCase().trim();

    return sections.filter((section) =>
      `${section.name} ${section.department} ${section.shift}`
        .toLowerCase()
        .includes(query)
    );
  }, [sections, search]);

  const totalStudents = sections.reduce(
    (total, section) => total + section.students,
    0
  );

  const departments = new Set(
    sections.map((section) => section.department)
  ).size;

  function openEdit(section: Section) {
    setForm({
      name: section.name,
      department: section.department,
      semester: String(section.semester),
      students: String(section.students),
      shift: section.shift,
    });
    setEditingId(section.id);
    setError("");
    setShowModal(true);
  }

  async function saveSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const students = Number(form.students);
    const semester = Number(form.semester);

    if (!Number.isInteger(students) || students < 1) {
      setError("Enter a valid student count greater than zero.");
      return;
    }

    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
      setError("Semester must be between 1 and 8.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      department: form.department,
      semester,
      students,
      shift: form.shift,
    };

    try {
      if (editingId !== null) {
        const updated = await api.put<Section>(`/sections/${editingId}`, payload);
        setSections((current) =>
          current.map((section) => (section.id === editingId ? updated : section))
        );
      } else {
        const created = await api.post<Section>("/sections", payload);
        setSections((current) => [...current, created]);
      }

      setForm(emptyForm);
      setEditingId(null);
      setError("");
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the section.");
    }
  }

  async function deleteSection(id: number) {
    if (!window.confirm("Are you sure you want to delete this section?")) return;

    try {
      await api.delete(`/sections/${id}`);
      setSections((current) => current.filter((section) => section.id !== id));
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not delete the section."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            ACADEMIC STRUCTURE
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Sections Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize student sections, semesters, and academic shifts.
          </p>
        </div>

        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setError("");
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add Section
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Sections"
          value={sections.length}
          description="Registered student groups"
          icon={<GraduationCap size={20} />}
        />
        <StatCard
          title="Total Students"
          value={totalStudents}
          description="Across all listed sections"
          icon={<Users size={20} />}
        />
        <StatCard
          title="Departments"
          value={departments}
          description="Represented in this list"
          icon={<BookOpen size={20} />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">All Sections</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading sections..."
                : loadError ||
                  `Showing ${filteredSections.length} of ${sections.length} sections`}
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sections..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Section</th>
                <th className="px-5 py-4 font-semibold">Department</th>
                <th className="px-5 py-4 font-semibold">Semester</th>
                <th className="px-5 py-4 font-semibold">Students</th>
                <th className="px-5 py-4 font-semibold">Shift</th>
                <th className="px-5 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredSections.map((section) => (
                <tr
                  key={section.id}
                  className="transition hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <GraduationCap size={19} />
                      </div>
                      <span className="font-semibold text-slate-800">
                        {section.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {section.department}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    Semester {section.semester}
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <Users size={15} className="text-slate-400" />
                      {section.students}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        section.shift === "Shift 1"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {section.shift}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(section)}
                        aria-label={`Edit ${section.name}`}
                        title="Edit section"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        onClick={() => deleteSection(section.id)}
                        aria-label={`Delete ${section.name}`}
                        title="Delete section"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSections.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="font-medium text-slate-700">
                      No sections found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or add a new section.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId !== null ? "Edit section" : "Add a section"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the academic group details.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveSection} className="space-y-4">
              <FormField label="Section name">
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. CSE-C"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </FormField>

              <FormField label="Department">
                <select
                  value={form.department}
                  onChange={(event) =>
                    setForm({ ...form, department: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option>Computer Science</option>
                  <option>Information Technology</option>
                  <option>Electronics & Communication</option>
                  <option>Mechanical Engineering</option>
                  <option>Electrical Engineering</option>
                  <option>Civil Engineering</option>
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </FormField>

                <FormField label="Student count">
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.students}
                    onChange={(event) =>
                      setForm({ ...form, students: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </FormField>
              </div>

              <FormField label="Academic shift">
                <select
                  value={form.shift}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      shift: event.target.value as Section["shift"],
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option>Shift 1</option>
                  <option>Shift 2</option>
                </select>
              </FormField>

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError("");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
