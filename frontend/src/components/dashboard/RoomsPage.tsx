import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

import {
  Search,
  Plus,
  DoorOpen,
  Users,
  FlaskConical,
  Presentation,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

type Room = {
  id: number;
  name: string;
  building: string;
  type: "Classroom" | "Laboratory" | "Seminar Hall";
  capacity: number;
  available: boolean;
};


  
const emptyForm = {
  name: "",
  building: "",
  type: "Classroom" as Room["type"],
  capacity: "60",
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api
      .get<Room[]>("/rooms")
      .then(setRooms)
      .catch(() => setLoadError("Could not load rooms. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const filteredRooms = useMemo(() => {
    const query = search.toLowerCase().trim();

    return rooms.filter((room) =>
      `${room.name} ${room.building} ${room.type}`
        .toLowerCase()
        .includes(query)
    );
  }, [rooms, search]);

  const availableCount = rooms.filter((room) => room.available).length;
  const totalCapacity = rooms.reduce(
    (total, room) => total + room.capacity,
    0
  );

      function openEdit(room: Room) {
    setForm({
      name: room.name,
      building: room.building,
      type: room.type,
      capacity: String(room.capacity),
    });
    setEditingId(room.id);
    setError("");
    setShowModal(true);
  }

  async function saveRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const capacity = Number(form.capacity);

    if (!Number.isInteger(capacity) || capacity < 1) {
      setError("Enter a valid capacity greater than zero.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      building: form.building.trim(),
      type: form.type,
      capacity,
    };

    try {
      if (editingId !== null) {
        const existing = rooms.find((room) => room.id === editingId);
        const updated = await api.put<Room>(`/rooms/${editingId}`, {
          ...payload,
          available: existing?.available ?? true,
        });
        setRooms((list) =>
          list.map((room) => (room.id === editingId ? updated : room))
        );
      } else {
        const created = await api.post<Room>("/rooms", payload);
        setRooms((list) => [...list, created]);
      }

      setForm(emptyForm);
      setEditingId(null);
      setError("");
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the room.");
    }
  }

  async function deleteRoom(id: number) {
    const confirmed = window.confirm("Are you sure you want to delete this room?");
    if (!confirmed) return;

    try {
      await api.delete(`/rooms/${id}`);
      setRooms((currentRooms) => currentRooms.filter((room) => room.id !== id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete the room.");
    }
  }

  function roomIcon(type: Room["type"]) {
    if (type === "Laboratory") {
      return <FlaskConical size={18} />;
    }

    if (type === "Seminar Hall") {
      return <Presentation size={18} />;
    }

    return <DoorOpen size={18} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            RESOURCE MANAGEMENT
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Rooms & Facilities
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage classrooms, laboratories, and seminar halls.
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
          Add Room
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Rooms"
          value={rooms.length}
          icon={<DoorOpen size={20} />}
          description="Registered facilities"
        />
        <StatCard
          title="Available Rooms"
          value={availableCount}
          icon={<Presentation size={20} />}
          description="Currently marked available"
        />
        <StatCard
          title="Total Capacity"
          value={totalCapacity}
          icon={<Users size={20} />}
          description="Combined seating capacity"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">All Rooms</h2>
            <p className="mt-1 text-sm text-slate-500">
                {loading
                ? "Loading rooms..."
                : loadError || `${filteredRooms.length} of ${rooms.length} rooms`}
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
              placeholder="Search rooms..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Room</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Type</th>
                <th className="px-5 py-4 font-semibold">Capacity</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        {roomIcon(room.type)}
                      </div>
                      <span className="font-semibold text-slate-800">
                        {room.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {room.building}
                  </td>

                  <td className="px-5 py-4 text-slate-600">{room.type}</td>

                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <Users size={15} className="text-slate-400" />
                      {room.capacity}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        room.available
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          room.available ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {room.available ? "Available" : "Unavailable"}
                    </span>
                  </td>

                                   <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => openEdit(room)}
                      aria-label={`Edit ${room.name}`}
                      title="Edit room"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      onClick={() => deleteRoom(room.id)}
                      aria-label={`Delete ${room.name}`}
                      title="Delete room"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Search
                      size={28}
                      className="mx-auto mb-3 text-slate-300"
                    />
                    <p className="font-medium text-slate-700">
                      No rooms found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or add a new room.
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
                    {editingId !== null ? "Edit room" : "Add a new room"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the facility details below.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

              <form onSubmit={saveRoom} className="space-y-4">
              <FormField label="Room name or number">
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. A-305"
                  className="form-input"
                />
              </FormField>

              <FormField label="Building / location">
                <input
                  required
                  value={form.building}
                  onChange={(event) =>
                    setForm({ ...form, building: event.target.value })
                  }
                  placeholder="e.g. Academic Block A"
                  className="form-input"
                />
              </FormField>

              <FormField label="Room type">
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      type: event.target.value as Room["type"],
                    })
                  }
                  className="form-input"
                >
                  <option>Classroom</option>
                  <option>Laboratory</option>
                  <option>Seminar Hall</option>
                </select>
              </FormField>

              <FormField label="Seating capacity">
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={form.capacity}
                  onChange={(event) =>
                    setForm({ ...form, capacity: event.target.value })
                  }
                  className="form-input"
                />
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
                  Save Room
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
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
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