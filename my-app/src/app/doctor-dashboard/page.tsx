'use client';
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Settings,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ClipboardList,
  Star,
  TrendingUp,
  AlertCircle,
  Menu,
  X,
  Stethoscope,
  Activity,
  Plus,
  Edit3,
  Trash2,
  Save,
  MoreVertical,
  Phone,
  Mail,
  Pill,
  HeartPulse,
  MessageSquare,
  ChevronRight,
  Filter,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// IMAGES
// ─────────────────────────────────────────────────────────────────────────────
const doctorAvatar =
  "https://images.unsplash.com/photo-1772987057599-2f1088c1e993?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBmZW1hbGUlMjBkb2N0b3IlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzM2MzExODl8MA&ixlib=rb-4.1.0&q=80&w=400";
const patient1 =
  "https://images.unsplash.com/photo-1689258077068-75eb291e503b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";
const patient2 =
  "https://images.unsplash.com/photo-1590905707155-17c680dd7867?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";
const patient3 =
  "https://images.unsplash.com/photo-1764084051438-369ad6a09334?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";
const patient4 =
  "https://images.unsplash.com/photo-1758686254563-5c5ab338c8b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";
const patient5 =
  "https://images.unsplash.com/photo-1741350172543-53af4630813f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type NavId = "dashboard" | "patients" | "appointments" | "records" | "settings";

type AppointmentStatus = "upcoming" | "in-progress" | "completed" | "cancelled";

interface Appointment {
  id: number;
  time: string;
  patient: string;
  avatar: string;
  type: string;
  status: AppointmentStatus;
  urgent: boolean;
}

interface Patient {
  id: number;
  name: string;
  avatar: string;
  age: number;
  condition: string;
  lastVisit: string;
  nextVisit: string;
  phone: string;
  email: string;
  status: "stable" | "attention" | "critical";
  notes: string;
}

// ── Availability block: a free time range for a day ──────────────────────────
interface TimeBlock {
  id: string;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

type WeekAvailability = Record<string, TimeBlock[]>;

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: NavId; label: string; icon: React.ElementType; badge?: number }[] = [
  { id: "dashboard",    label: "Dashboard",       icon: LayoutDashboard },
  { id: "patients",     label: "My Patients",     icon: Users,          badge: 24 },
  { id: "appointments", label: "Appointments",    icon: CalendarDays,   badge: 3  },
  { id: "records",      label: "Medical Records", icon: FileText              },
  { id: "settings",     label: "Settings",        icon: Settings              },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const INITIAL_AVAILABILITY: WeekAvailability = {
  Mon: [
    { id: "m1", start: "09:00", end: "12:00" },
    { id: "m2", start: "14:00", end: "18:00" },
  ],
  Tue: [
    { id: "t1", start: "08:30", end: "13:30" },
  ],
  Wed: [
    { id: "w1", start: "10:00", end: "12:00" },
    { id: "w2", start: "15:00", end: "19:00" },
  ],
  Thu: [
    { id: "th1", start: "09:00", end: "17:00" },
  ],
  Fri: [
    { id: "f1", start: "11:30", end: "16:00" },
  ],
  Sat: [],
  Sun: [],
};

const APPOINTMENTS_DATA: Appointment[] = [
  { id: 1, time: "09:00 AM", patient: "Liam Carter",      avatar: patient1, type: "General Checkup",      status: "completed",   urgent: false },
  { id: 2, time: "09:30 AM", patient: "Sophia Reeves",    avatar: patient2, type: "Follow-up",            status: "completed",   urgent: false },
  { id: 3, time: "10:15 AM", patient: "James Thornton",   avatar: patient3, type: "Consultation",         status: "in-progress", urgent: true  },
  { id: 4, time: "11:00 AM", patient: "Edith Hale",       avatar: patient4, type: "Prescription Refill",  status: "upcoming",    urgent: false },
  { id: 5, time: "11:45 AM", patient: "Noah Fernandez",   avatar: patient5, type: "Lab Results Review",   status: "upcoming",    urgent: true  },
  { id: 6, time: "02:00 PM", patient: "Liam Carter",      avatar: patient1, type: "Post-op Check",        status: "upcoming",    urgent: false },
  { id: 7, time: "03:00 PM", patient: "Sophia Reeves",    avatar: patient2, type: "Blood Pressure Review",status: "cancelled",   urgent: false },
];

const PATIENTS_DATA: Patient[] = [
  { id: 1, name: "Liam Carter",    avatar: patient1, age: 28, condition: "Hypertension",          lastVisit: "Mar 10, 2026", nextVisit: "Mar 17, 2026", phone: "+1 555-0101", email: "liam@email.com",   status: "stable",    notes: "BP well controlled on current medication." },
  { id: 2, name: "Sophia Reeves",  avatar: patient2, age: 34, condition: "Type 2 Diabetes",       lastVisit: "Mar 12, 2026", nextVisit: "Mar 26, 2026", phone: "+1 555-0102", email: "sophia@email.com", status: "attention", notes: "HbA1c slightly elevated, review diet plan." },
  { id: 3, name: "James Thornton", avatar: patient3, age: 52, condition: "Coronary Artery Disease",lastVisit: "Mar 16, 2026", nextVisit: "Mar 23, 2026", phone: "+1 555-0103", email: "james@email.com",  status: "critical",  notes: "Post-stent placement, close monitoring required." },
  { id: 4, name: "Edith Hale",     avatar: patient4, age: 67, condition: "Arthritis",             lastVisit: "Feb 28, 2026", nextVisit: "Apr 01, 2026", phone: "+1 555-0104", email: "edith@email.com",  status: "stable",    notes: "Responding well to new NSAID therapy." },
  { id: 5, name: "Noah Fernandez", avatar: patient5, age: 19, condition: "Asthma",                lastVisit: "Mar 05, 2026", nextVisit: "Mar 16, 2026", phone: "+1 555-0105", email: "noah@email.com",   status: "attention", notes: "Rescue inhaler usage increased this month." },
];

const NOTIFICATIONS = [
  { id: 1, text: "New appointment request from Liam Carter",        time: "5 min ago",  unread: true  },
  { id: 2, text: "Lab results ready for James Thornton",            time: "20 min ago", unread: true  },
  { id: 3, text: "Prescription renewal reminder – Sophia Reeves",   time: "1 hr ago",   unread: true  },
  { id: 4, text: "System maintenance scheduled tonight",            time: "3 hrs ago",  unread: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<AppointmentStatus, { label: string; bg: string; text: string; dot: string }> = {
  upcoming:    { label: "Upcoming",    bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
  "in-progress":{ label: "In Progress",bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500"  },
  completed:   { label: "Completed",   bg: "bg-emerald-50",text: "text-emerald-700",dot: "bg-emerald-500"},
  cancelled:   { label: "Cancelled",   bg: "bg-red-50",    text: "text-red-500",    dot: "bg-red-400"    },
};

const PATIENT_STATUS_CFG = {
  stable:    { label: "Stable",          bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  attention: { label: "Needs Attention", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"  },
  critical:  { label: "Critical",        bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200"    },
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Returns a sorted list of HH:MM values at 30-min increments from 00:00 to 23:30
function allHalfHours(): string[] {
  const list: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      list.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return list;
}
const HALF_HOURS = allHalfHours();

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string; trend?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-sm truncate">{label}</p>
        <p className="text-gray-900 mt-0.5" style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1.2 }}>{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {trend && (
            <span className="flex items-center gap-0.5 text-emerald-600 text-xs">
              <TrendingUp size={11} /> {trend}
            </span>
          )}
          <span className="text-gray-400 text-xs">{sub}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD / EDIT AVAILABILITY MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface BlockModalProps {
  editingBlock: { day: string; block: TimeBlock } | null;
  onClose: () => void;
  onSave: (day: string, block: TimeBlock) => void;
  defaultDay?: string;
}

function BlockModal({ editingBlock, onClose, onSave, defaultDay = "Mon" }: BlockModalProps) {
  const [day, setDay]     = useState(editingBlock?.day   ?? defaultDay);
  const [start, setStart] = useState(editingBlock?.block.start ?? "09:00");
  const [end, setEnd]     = useState(editingBlock?.block.end   ?? "17:00");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      setError("End time must be after start time.");
      return;
    }
    onSave(day, { id: editingBlock?.block.id ?? uid(), start, end });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-gray-900 text-base" style={{ fontWeight: 700 }}>
            {editingBlock ? "Edit Time Block" : "Add Availability Block"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Day selector */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Day</label>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`py-1.5 rounded-lg text-xs transition-colors ${
                  day === d ? "text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={day === d ? { background: "#2563eb", fontWeight: 600 } : { fontWeight: 500 }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Start time */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Start Time</label>
          <select
            value={start}
            onChange={(e) => { setStart(e.target.value); setError(""); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          >
            {HALF_HOURS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* End time */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>End Time</label>
          <select
            value={end}
            onChange={(e) => { setEnd(e.target.value); setError(""); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          >
            {HALF_HOURS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-red-500 text-xs mb-3 flex items-center gap-1">
            <AlertCircle size={13} /> {error}
          </p>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
            style={{ fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm transition-colors shadow-sm"
            style={{ background: "#2563eb", fontWeight: 600 }}
          >
            {editingBlock ? "Update" : "Add Block"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY AVAILABILITY (fully custom time ranges)
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyAvailability({
  availability, setAvailability,
}: {
  availability: WeekAvailability;
  setAvailability: React.Dispatch<React.SetStateAction<WeekAvailability>>;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<{ day: string; block: TimeBlock } | null>(null);
  const [addDay, setAddDay] = useState("Mon");

  const totalBlocks = Object.values(availability).reduce((s, arr) => s + arr.length, 0);
  const totalHours = Object.values(availability).reduce((s, arr) => {
    return s + arr.reduce((ss, b) => ss + (timeToMinutes(b.end) - timeToMinutes(b.start)) / 60, 0);
  }, 0);

  const handleSave = (day: string, block: TimeBlock) => {
    setAvailability((prev) => {
      const existing = prev[day] ?? [];
      const idx = existing.findIndex((b) => b.id === block.id);
      if (idx >= 0) {
        const updated = [...existing];
        updated[idx] = block;
        return { ...prev, [day]: updated };
      }
      return { ...prev, [day]: [...existing, block] };
    });
  };

  const handleDelete = (day: string, id: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).filter((b) => b.id !== id),
    }));
  };

  const openAdd = (day: string) => {
    setAddDay(day);
    setEditingBlock(null);
    setShowModal(true);
  };

  const openEdit = (day: string, block: TimeBlock) => {
    setEditingBlock({ day, block });
    setShowModal(true);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-gray-900" style={{ fontSize: "15px", fontWeight: 600 }}>Weekly Availability</h3>
            <p className="text-gray-400 text-xs mt-0.5">Week of Mar 16 – Mar 22, 2026 · Drag-free time block editor</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
              <span><span className="text-blue-600" style={{ fontWeight: 600 }}>{totalBlocks}</span> blocks</span>
              <span><span className="text-emerald-600" style={{ fontWeight: 600 }}>{totalHours.toFixed(1)}h</span> available</span>
            </div>
            <button
              onClick={() => { setEditingBlock(null); setAddDay("Mon"); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: "#2563eb", fontWeight: 600 }}
            >
              <Plus size={13} /> Add Block
            </button>
          </div>
        </div>

        {/* Day columns */}
        <div className="p-4 overflow-x-auto">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(7, minmax(120px, 1fr))", minWidth: "700px" }}>
            {DAYS.map((day) => {
              const blocks = availability[day] ?? [];
              return (
                <div key={day} className="flex flex-col gap-2">
                  {/* Day header */}
                  <div className="flex items-center justify-between px-2 pb-1 border-b border-gray-100">
                    <span className="text-xs" style={{ fontWeight: 700, color: "#374151" }}>{day}</span>
                    <button
                      onClick={() => openAdd(day)}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title={`Add block for ${day}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Blocks */}
                  {blocks.length === 0 ? (
                    <div
                      onClick={() => openAdd(day)}
                      className="rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center py-5 text-gray-300 hover:border-blue-300 hover:text-blue-400 cursor-pointer transition-colors"
                    >
                      <Plus size={16} />
                      <span className="text-xs mt-1">Off</span>
                    </div>
                  ) : (
                    blocks
                      .slice()
                      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
                      .map((block) => (
                        <div
                          key={block.id}
                          className="group relative rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Clock size={11} className="text-blue-500 flex-shrink-0" />
                            <span className="text-blue-700 text-xs tabular-nums" style={{ fontWeight: 600 }}>
                              {block.start}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-blue-400 text-xs ml-3">→</span>
                            <span className="text-blue-700 text-xs tabular-nums" style={{ fontWeight: 600 }}>
                              {block.end}
                            </span>
                          </div>
                          <p className="text-blue-400 text-xs mt-1 ml-3">
                            {((timeToMinutes(block.end) - timeToMinutes(block.start)) / 60).toFixed(1)}h
                          </p>
                          {/* Actions */}
                          <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-0.5 bg-white rounded-lg shadow-sm border border-gray-100 px-1 py-0.5">
                            <button
                              onClick={() => openEdit(day, block)}
                              className="text-gray-400 hover:text-blue-600 p-0.5 transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              onClick={() => handleDelete(day, block.id)}
                              className="text-gray-400 hover:text-red-500 p-0.5 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
          <AlertCircle size={12} />
          Hover a block to edit or delete. Click <Plus size={11} className="inline" /> next to a day to add a new time range.
        </div>
      </div>

      {showModal && (
        <BlockModal
          editingBlock={editingBlock}
          defaultDay={addDay}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS TABLE
// ─────────────────────────────────────────────────────────────────────────────
function AppointmentsTable({
  appointments, setAppointments, onViewPatient,
}: {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  onViewPatient: (name: string) => void;
}) {
  const markCompleted = (id: number) =>
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "completed" } : a)));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-gray-900" style={{ fontSize: "15px", fontWeight: 600 }}>Today's Appointments</h3>
          <p className="text-gray-400 text-xs mt-0.5">Monday, March 16 2026</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600" style={{ fontWeight: 600 }}>
          {appointments.length} total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Time</th>
              <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Patient</th>
              <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wide hidden md:table-cell" style={{ fontWeight: 600 }}>Type</th>
              <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Status</th>
              <th className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {appointments.map((appt) => {
              const cfg = STATUS_CFG[appt.status];
              return (
                <tr key={appt.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {appt.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                      <span className="text-gray-700 tabular-nums text-xs" style={{ fontWeight: 600 }}>{appt.time}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <img src={appt.avatar} alt={appt.patient} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      <span className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{appt.patient}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 hidden md:table-cell">
                    <span className="text-gray-500 text-xs">{appt.type}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`} style={{ fontWeight: 500 }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewPatient(appt.patient)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
                        style={{ fontWeight: 500 }}
                      >
                        <Eye size={13} /> View
                      </button>
                      {(appt.status === "upcoming" || appt.status === "in-progress") && (
                        <button
                          onClick={() => markCompleted(appt.id)}
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-50"
                          style={{ fontWeight: 500 }}
                        >
                          <CheckCircle2 size={13} /> Done
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT LIST
// ─────────────────────────────────────────────────────────────────────────────
function PatientList({ onSelectPatient }: { onSelectPatient: (p: Patient) => void }) {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<"all" | "stable" | "attention" | "critical">("all");

  const filtered = PATIENTS_DATA.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h3 className="text-gray-900" style={{ fontSize: "15px", fontWeight: 600 }}>My Patients</h3>
          <p className="text-gray-400 text-xs mt-0.5">{filtered.length} patients</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700 w-36"
            />
          </div>
          {/* Filter */}
          {(["all", "stable", "attention", "critical"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-colors ${
                filter === f ? "text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={filter === f ? { background: "#2563eb", fontWeight: 600 } : { fontWeight: 500 }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {filtered.map((p) => {
          const cfg = PATIENT_STATUS_CFG[p.status];
          return (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
              <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-gray-800 text-sm truncate" style={{ fontWeight: 600 }}>{p.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontWeight: 500 }}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-0.5 truncate">{p.age} yrs · {p.condition}</p>
                <p className="text-gray-300 text-xs mt-0.5">Last visit: {p.lastVisit}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onSelectPatient(p)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <Eye size={13} /> Profile
                </button>
                <button
                  onClick={() => onSelectPatient(p)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <FileText size={13} /> Record
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT MODAL (profile + medical record preview)
// ─────────────────────────────────────────────────────────────────────────────
function PatientModal({
  patient, onClose,
}: {
  patient: Patient | null;
  onClose: () => void;
}) {
  const [tab, setTab]           = useState<"overview" | "record">("overview");
  const [diagnosis, setDiagnosis]   = useState("");
  const [prescription, setPrescription] = useState("");
  const [note, setNote]         = useState("");
  const [saved, setSaved]       = useState(false);

  if (!patient) return null;

  const cfg = PATIENT_STATUS_CFG[patient.status];

  const handleSaveRecord = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
          <img src={patient.avatar} alt={patient.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-gray-900 text-base truncate" style={{ fontWeight: 700 }}>{patient.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontWeight: 500 }}>
                {cfg.label}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">{patient.age} yrs · {patient.condition}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(["overview", "record"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 mr-6 text-sm capitalize border-b-2 transition-colors ${
                tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
              style={{ fontWeight: tab === t ? 600 : 500 }}
            >
              {t === "overview" ? "Patient Overview" : "Medical Record"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "overview" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Phone",      value: patient.phone, icon: Phone },
                  { label: "Email",      value: patient.email, icon: Mail  },
                  { label: "Last Visit", value: patient.lastVisit, icon: CalendarDays },
                  { label: "Next Visit", value: patient.nextVisit, icon: CalendarDays },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={12} className="text-gray-400" />
                      <span className="text-gray-400 text-xs">{label}</span>
                    </div>
                    <p className="text-gray-800 text-xs" style={{ fontWeight: 600 }}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-amber-600 text-xs mb-1" style={{ fontWeight: 600 }}>Doctor Notes</p>
                <p className="text-amber-900 text-sm leading-relaxed">{patient.notes}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Diagnosis</label>
                <textarea
                  rows={2}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Add diagnosis…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Prescription</label>
                <textarea
                  rows={2}
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="List medications and dosages…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Clinical Notes</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Observations, follow-up instructions…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                />
              </div>
              <button
                onClick={handleSaveRecord}
                className="w-full py-2.5 rounded-xl text-white text-sm transition-opacity hover:opacity-90"
                style={{ background: "#2563eb", fontWeight: 600 }}
              >
                {saved ? "✓ Saved!" : "Save Record"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function DoctorDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [activeNav, setActiveNav]         = useState<NavId>("dashboard");
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [availability, setAvailability]   = useState<WeekAvailability>(INITIAL_AVAILABILITY);
  const [appointments, setAppointments]   = useState<Appointment[]>(APPOINTMENTS_DATA);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [topSearch, setTopSearch]         = useState("");
  
  // User data state
  const [user, setUser] = useState<any>(null);
  const [doctorName, setDoctorName] = useState<string>("Dr. Sarah Al-Hassan");
  const [specialty, setSpecialty] = useState<string>("Cardiologist");
  const [loading, setLoading] = useState(true);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUserData() {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Load doctor profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, specialty")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching doctor profile:", profileError.message);
        // Fallback to user metadata
        setDoctorName(user.user_metadata?.name || "Doctor");
        setSpecialty(user.user_metadata?.specialty || "General Practitioner");
      } else {
        setDoctorName(profile?.full_name || "Doctor");
        setSpecialty(profile?.specialty || "General Practitioner");
      }

      setLoading(false);
    }

    loadUserData();

    document.title = "Doctor Dashboard – Mofid";
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current  && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const Sidebar = ({ mobile = false }) => (
    <aside
      className={`${
        mobile ? "fixed inset-y-0 left-0 z-50 w-64 shadow-2xl" : "hidden lg:flex"
      } flex-col bg-white border-r border-gray-100 h-screen flex-shrink-0`}
      style={{ width: mobile ? 256 : 240 }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo width={120} height={40} />
        </Link>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Doctor card */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50">
          <img src={doctorAvatar} alt={doctorName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-gray-900 text-sm truncate" style={{ fontWeight: 600 }}>{doctorName}</p>
            <p className="text-blue-600 text-xs">{specialty}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-gray-400 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>Main Menu</p>
        {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
          const active = activeNav === id;
          return (
            <button
              key={id}
              onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                active ? "text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              style={active ? { background: "#2563eb", fontWeight: 600 } : {}}
            >
              <Icon size={18} className={active ? "text-white" : "text-gray-400"} />
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={active
                    ? { background: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700 }
                    : { background: "#eff6ff", color: "#2563eb", fontWeight: 700 }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <Link
          href="/login"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </Link>
      </div>
    </aside>
  );

  // ── Topbar ────────────────────────────────────────────────────────────────
  const Topbar = () => (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-4 flex-shrink-0 z-40">
      <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 p-1">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={topSearch}
          onChange={(e) => setTopSearch(e.target.value)}
          placeholder="Search patients, appointments…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
                style={{ background: "#ef4444", fontSize: "10px", fontWeight: 700 }}
              >
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Notifications</span>
                <span className="text-blue-600 text-xs cursor-pointer hover:underline">Mark all read</span>
              </div>
              {NOTIFICATIONS.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex gap-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 ${
                    n.unread ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.unread ? "bg-blue-500" : "bg-transparent"}`} />
                  <div>
                    <p className="text-gray-800 text-xs leading-relaxed">{n.text}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
          >
            <img src={doctorAvatar} alt={doctorName} className="w-8 h-8 rounded-full object-cover" />
            <div className="hidden md:block text-left">
              <p className="text-gray-800 text-xs leading-tight" style={{ fontWeight: 600 }}>{doctorName}</p>
              <p className="text-gray-400 text-xs leading-tight">{specialty}</p>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{doctorName}</p>
                <p className="text-gray-400 text-xs">{user?.email || "doctor@mofid.health"}</p>
              </div>
              {[
                { icon: User,       label: "My Profile"  },
                { icon: Settings,   label: "Settings"    },
                { icon: Stethoscope,label: "My Schedule" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                >
                  <Icon size={15} className="text-gray-400" /> {label}
                </button>
              ))}
              <div className="border-t border-gray-100">
                <Link
                  href="/login"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 text-sm hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} /> Log Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  // ── Dashboard main content ────────────────────────────────────────────────
  const DashboardContent = () => (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #4f46e5 100%)" }}
      >
        <div>
          <h1 className="text-white" style={{ fontSize: "20px", fontWeight: 700 }}>Good morning, {doctorName}! 👋</h1>
          <p className="text-blue-200 text-sm mt-1">
            You have{" "}
            <span className="text-white" style={{ fontWeight: 600 }}>
              {appointments.filter((a) => a.status === "upcoming" || a.status === "in-progress").length} appointments
            </span>{" "}
            today and{" "}
            <span className="text-white" style={{ fontWeight: 600 }}>2 urgent cases</span> to review.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
            <p className="text-blue-200 text-xs">Today</p>
            <p className="text-white text-xl" style={{ fontWeight: 700 }}>7</p>
            <p className="text-blue-200 text-xs">appts</p>
          </div>
          <div className="text-center px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
            <p className="text-blue-200 text-xs">This Week</p>
            <p className="text-white text-xl" style={{ fontWeight: 700 }}>32</p>
            <p className="text-blue-200 text-xs">appts</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Today's Appointments" value="7"   sub="vs 5 yesterday"      color="bg-blue-500"   trend="+2"   />
        <StatCard icon={Users}        label="Total Patients"       value="24"  sub="active patients"     color="bg-violet-500" trend="+3"   />
        <StatCard icon={FileText}     label="Pending Records"      value="5"   sub="need review"         color="bg-amber-500"             />
        <StatCard icon={Star}         label="Patient Rating"       value="4.9" sub="128 reviews"         color="bg-emerald-500"trend="+0.1"/>
      </div>

      {/* Weekly Availability */}
      <WeeklyAvailability availability={availability} setAvailability={setAvailability} />

      {/* Appointments + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AppointmentsTable
            appointments={appointments}
            setAppointments={setAppointments}
            onViewPatient={(name) => {
              const p = PATIENTS_DATA.find((pt) => pt.name === name);
              if (p) setSelectedPatient(p);
            }}
          />
        </div>
        <div className="space-y-4">
          {/* Urgent follow-ups */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-gray-900 mb-3" style={{ fontSize: "14px", fontWeight: 600 }}>Urgent Follow-ups</h3>
            <div className="space-y-3">
              {PATIENTS_DATA.filter((p) => p.status !== "stable").map((p) => {
                const cfg = PATIENT_STATUS_CFG[p.status];
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-xs truncate" style={{ fontWeight: 600 }}>{p.name}</p>
                      <p className="text-gray-400 text-xs truncate">{p.condition}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} flex-shrink-0`} style={{ fontWeight: 500 }}>
                      {p.status === "critical" ? "Critical" : "Attention"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's overview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-gray-900 mb-3" style={{ fontSize: "14px", fontWeight: 600 }}>Today's Overview</h3>
            <div className="space-y-3">
              {[
                { icon: CheckCircle2, label: "Completed",  value: appointments.filter((a) => a.status === "completed").length,    color: "text-emerald-600", bg: "bg-emerald-50" },
                { icon: Activity,     label: "In Progress",value: appointments.filter((a) => a.status === "in-progress").length,  color: "text-amber-600",   bg: "bg-amber-50"   },
                { icon: Clock,        label: "Upcoming",   value: appointments.filter((a) => a.status === "upcoming").length,     color: "text-blue-600",    bg: "bg-blue-50"    },
                { icon: XCircle,      label: "Cancelled",  value: appointments.filter((a) => a.status === "cancelled").length,    color: "text-red-500",     bg: "bg-red-50"     },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} className={color} />
                  </div>
                  <span className="text-gray-600 text-sm flex-1">{label}</span>
                  <span className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Patient list */}
      <PatientList onSelectPatient={setSelectedPatient} />
    </div>
  );

  // ── Per-nav page content ──────────────────────────────────────────────────
  const pageContent: Record<NavId, React.ReactNode> = {
    dashboard: <DashboardContent />,
    patients: (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-gray-900 text-lg" style={{ fontWeight: 700 }}>My Patients</h2>
          <p className="text-gray-400 text-sm mt-1">Full patient registry and management</p>
        </div>
        <PatientList onSelectPatient={setSelectedPatient} />
      </div>
    ),
    appointments: (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-gray-900 text-lg" style={{ fontWeight: 700 }}>Appointments</h2>
          <p className="text-gray-400 text-sm mt-1">Manage all your scheduled appointments</p>
        </div>
        <WeeklyAvailability availability={availability} setAvailability={setAvailability} />
        <AppointmentsTable
          appointments={appointments}
          setAppointments={setAppointments}
          onViewPatient={(name) => {
            const p = PATIENTS_DATA.find((pt) => pt.name === name);
            if (p) setSelectedPatient(p);
          }}
        />
      </div>
    ),
    records: (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <ClipboardList size={40} className="text-gray-300 mx-auto mb-3" />
        <h2 className="text-gray-700 text-lg" style={{ fontWeight: 700 }}>Medical Records</h2>
        <p className="text-gray-400 text-sm mt-1">Patient medical records and history will appear here.</p>
        <p className="text-gray-300 text-xs mt-3">Select a patient from "My Patients" to view their record.</p>
      </div>
    ),
    settings: (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <Settings size={40} className="text-gray-300 mx-auto mb-3" />
        <h2 className="text-gray-700 text-lg" style={{ fontWeight: 700 }}>Settings</h2>
        <p className="text-gray-400 text-sm mt-1">Account and platform settings will appear here.</p>
      </div>
    ),
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          {pageContent[activeNav]}
        </main>
      </div>

      {/* Patient modal */}
      <PatientModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
    </div>
  );
}
