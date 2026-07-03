import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';

type Section = 'classes' | 'schedules' | 'users';

interface ClassItem {
  id: string;
  name: string;
  teacher: { name: string };
}

interface TeacherOption {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const { name, token, logout } = useAuth();
  const [section, setSection] = useState<Section>('classes');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-56 bg-white border-r border-slate-200 min-h-screen p-4">
        <h1 className="text-sm font-semibold text-slate-900 mb-1">SmartAttend</h1>
        <p className="text-xs text-slate-400 mb-6">Admin — {name}</p>

        <nav className="space-y-1">
          {(['classes', 'schedules', 'users'] as Section[]).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm capitalize ${
                section === s ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </nav>

        <button onClick={logout} className="mt-8 text-sm text-blue-600 hover:underline">Log out</button>
      </aside>

      <main className="flex-1 p-8">
        {section === 'classes' && <ClassesSection token={token} />}
        {section === 'schedules' && <SchedulesSection token={token} />}
        {section === 'users' && <UsersSection token={token} />}
      </main>
    </div>
  );
}

function ClassesSection({ token }: { token: string | null }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [classesRes, teachersRes] = await Promise.all([
        api.get<ClassItem[]>('/api/classes', token),
        api.get<TeacherOption[]>('/api/auth/users?role=teacher', token),
      ]);
      if (!cancelled) {
        if (classesRes.success && classesRes.data) setClasses(classesRes.data);
        if (teachersRes.success && teachersRes.data) setTeachers(teachersRes.data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !teacherId) {
      setError('Class name and teacher are both required');
      return;
    }
    setSubmitting(true);
    const res = await api.post('/api/classes', { name: name.trim(), teacherId }, token);
    setSubmitting(false);
    if (res.success) {
      setName('');
      setTeacherId('');
      setReloadKey((k) => k + 1);
    } else {
      setError(res.error ?? 'Failed to create class');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this class? This will fail if any schedules exist for it.')) return;
    const res = await api.delete(`/api/classes/${id}`, token);
    if (res.success) {
      setReloadKey((k) => k + 1);
    } else {
      alert(res.error ?? 'Delete failed');
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Classes</h2>

      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Class name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Software Engineering"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Teacher</label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select a teacher…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-slate-400">No classes yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {classes.map((c) => (
            <div key={c.id} className="p-4 flex justify-between items-center">
              <div>
                <div className="font-medium text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-400">Taught by {c.teacher.name}</div>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ScheduleItem {
  id: string;
  roomName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  verificationConfig: string;
  sessionOpen: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CONFIG_OPTIONS = ['C0', 'C1', 'C2', 'C3', 'C4', 'C5'];

function SchedulesSection({ token }: { token: string | null }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState('');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [roomName, setRoomName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [verificationConfig, setVerificationConfig] = useState('C2');
  const [geofenceLat, setGeofenceLat] = useState('');
  const [geofenceLng, setGeofenceLng] = useState('');
  const [geofenceRadiusMetres, setGeofenceRadiusMetres] = useState('50');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingClasses(true);
      const res = await api.get<ClassItem[]>('/api/classes', token);
      if (!cancelled && res.success && res.data) setClasses(res.data);
      if (!cancelled) setLoadingClasses(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!classId) {
        if (!cancelled) setSchedules([]);
        return;
      }
      setLoadingSchedules(true);
      const res = await api.get<ScheduleItem[]>(`/api/schedules?classId=${classId}`, token);
      if (!cancelled && res.success && res.data) setSchedules(res.data);
      if (!cancelled) setLoadingSchedules(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, token, reloadKey]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!classId || !roomName.trim()) {
      setError('Class and room name are required');
      return;
    }
    setSubmitting(true);
    const res = await api.post(
      '/api/schedules',
      {
        classId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        roomName: roomName.trim(),
        verificationConfig,
        geofenceLat: geofenceLat ? Number(geofenceLat) : undefined,
        geofenceLng: geofenceLng ? Number(geofenceLng) : undefined,
        geofenceRadiusMetres: Number(geofenceRadiusMetres),
      },
      token,
    );
    setSubmitting(false);
    if (res.success) {
      setRoomName('');
      setGeofenceLat('');
      setGeofenceLng('');
      setReloadKey((k) => k + 1);
    } else {
      setError(res.error ?? 'Failed to create schedule');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this schedule? This will fail if attendance records exist for it.')) return;
    const res = await api.delete(`/api/schedules/${id}`, token);
    if (res.success) {
      setReloadKey((k) => k + 1);
    } else {
      alert(res.error ?? 'Delete failed');
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Schedules</h2>

      <div className="mb-6">
        <label className="block text-xs font-medium text-slate-500 mb-1">Class</label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="w-72 border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">{loadingClasses ? 'Loading…' : 'Select a class…'}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {classId && (
        <>
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Room name</label>
              <input value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Day of week</label>
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Verification config</label>
              <select value={verificationConfig} onChange={(e) => setVerificationConfig(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                {CONFIG_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Start time</label>
              <input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="09:00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">End time</label>
              <input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="10:00" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Geofence radius (m)</label>
              <input value={geofenceRadiusMetres} onChange={(e) => setGeofenceRadiusMetres(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Geofence latitude</label>
              <input value={geofenceLat} onChange={(e) => setGeofenceLat(e.target.value)} placeholder="optional" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Geofence longitude</label>
              <input value={geofenceLng} onChange={(e) => setGeofenceLng(e.target.value)} placeholder="optional" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Create Schedule
              </button>
            </div>
          </form>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {loadingSchedules ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-slate-400">No schedules for this class yet.</p>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {schedules.map((s) => (
                <div key={s.id} className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-900">{s.roomName}</div>
                    <div className="text-xs text-slate-400">
                      {DAY_NAMES[s.dayOfWeek]} {s.startTime}–{s.endTime} · {s.verificationConfig} ·{' '}
                      {s.sessionOpen ? 'Session open' : 'Session closed'}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  studentId: string | null;
  isDisabled: boolean;
}

function UsersSection({ token }: { token: string | null }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'student' | 'teacher'>('student');
  const [formStudentId, setFormStudentId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.get<UserItem[]>('/api/auth/users', token);
      if (!cancelled && res.success && res.data) setUsers(res.data);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formName.trim() || !formEmail.trim() || !formPassword) {
      setError('Name, email, and password are required');
      return;
    }
    setSubmitting(true);
    const res = await api.post(
      '/api/auth/users',
      {
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
        studentId: formRole === 'student' && formStudentId.trim() ? formStudentId.trim() : undefined,
      },
      token,
    );
    setSubmitting(false);
    if (res.success) {
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormStudentId('');
      setReloadKey((k) => k + 1);
    } else {
      setError(res.error ?? 'Failed to create user');
    }
  }

  async function handleToggleDisabled(id: string, currentlyDisabled: boolean) {
    const res = await api.patch(`/api/auth/users/${id}/toggle-disabled`, {}, token);
    if (res.success) {
      setReloadKey((k) => k + 1);
    } else {
      alert(res.error ?? 'Failed to update user');
    }
    void currentlyDisabled;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Users</h2>

      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
          <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
          <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
          <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
          <select value={formRole} onChange={(e) => setFormRole(e.target.value as 'student' | 'teacher')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        {formRole === 'student' && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Student ID (optional)</label>
            <input value={formStudentId} onChange={(e) => setFormStudentId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        )}
        <div className="flex items-end">
          <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Create User
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="p-4 flex justify-between items-center">
              <div>
                <div className={`font-medium ${u.isDisabled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {u.name}
                </div>
                <div className="text-xs text-slate-400">{u.email}{u.studentId ? ` · ${u.studentId}` : ''}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">{u.role}</span>
                {u.role !== 'admin' && (
                  <button
                    onClick={() => handleToggleDisabled(u.id, u.isDisabled)}
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      u.isDisabled ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {u.isDisabled ? 'Enable' : 'Disable'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}