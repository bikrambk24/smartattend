import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import EmptyState from '../components/EmptyState';
import Logo from '../components/Logo';

type Section = 'classes' | 'schedules' | 'users' | 'enrollments';

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
      <aside className="w-56 bg-ink min-h-screen p-4">
        <div className="mb-1">
          <Logo variant="dark" size={20} />
        </div>
        <p className="text-xs text-slate-400 mb-6">Admin — {name}</p>

        <nav className="space-y-1">
          {(['classes', 'schedules', 'users', 'enrollments'] as Section[]).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm capitalize ${
                section === s ? 'bg-teal text-white' : 'text-slate-300 hover:bg-ink-light'
              }`}
            >
              {s}
            </button>
          ))}
        </nav>

        <button onClick={logout} className="mt-8 text-sm text-teal-light hover:underline">Log out</button>
      </aside>

      <main className="flex-1 p-8">
        {section === 'classes' && <ClassesSection token={token} />}
        {section === 'schedules' && <SchedulesSection token={token} />}
        {section === 'users' && <UsersSection token={token} />}
        {section === 'enrollments' && <EnrollmentsSection token={token} />}
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
      <h2 className="font-display text-xl font-bold text-ink mb-6">Classes</h2>

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
          className="bg-teal text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-dark disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create your first class above by giving it a name and assigning a teacher."
        />
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

  async function handleConfigChange(scheduleId: string, newConfig: string) {
    const res = await api.patch(`/api/schedules/${scheduleId}`, { verificationConfig: newConfig }, token);
    if (res.success) {
      setReloadKey((k) => k + 1);
    } else {
      alert(res.error ?? 'Failed to update verification config');
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink mb-6">Schedules</h2>

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

      {!classId && (
        <EmptyState
          title="Select a class to view its schedules"
          description="Choose a class from the dropdown above, or create one first if none exist yet."
        />
      )}

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
              <button type="submit" disabled={submitting} className="w-full bg-teal text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-dark disabled:opacity-50">
                Create schedule
              </button>
            </div>
          </form>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {loadingSchedules ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : schedules.length === 0 ? (
            <EmptyState
              title="No schedules yet for this class"
              description="Add a schedule above with a room, day, time, and verification level. Students won't see this class until a schedule exists."
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {schedules.map((s) => (
                <div key={s.id} className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-900">{s.roomName}</div>
                    <div className="text-xs text-slate-400">
                      {DAY_NAMES[s.dayOfWeek]} {s.startTime}–{s.endTime} ·{' '}
                      {s.sessionOpen ? 'Session open' : 'Session closed'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={s.verificationConfig}
                      onChange={(e) => handleConfigChange(s.id, e.target.value)}
                      className="text-xs border border-slate-300 rounded px-2 py-1"
                    >
                      {CONFIG_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
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
      <h2 className="font-display text-xl font-bold text-ink mb-6">Users</h2>

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
          <button type="submit" disabled={submitting} className="w-full bg-teal text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-dark disabled:opacity-50">
            Create user
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : users.length === 0 ? (
        <EmptyState title="No users yet" description="Create your first student or teacher account above." />
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

interface EnrollmentItem {
  id: string;
  student: { id: string; name: string; email: string; studentId: string | null };
}

interface StudentOption {
  id: string;
  name: string;
}

function EnrollmentsSection({ token }: { token: string | null }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState('');
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingClasses(true);
      const [classesRes, studentsRes] = await Promise.all([
        api.get<ClassItem[]>('/api/classes', token),
        api.get<StudentOption[]>('/api/auth/users?role=student', token),
      ]);
      if (!cancelled) {
        if (classesRes.success && classesRes.data) setClasses(classesRes.data);
        if (studentsRes.success && studentsRes.data) setStudents(studentsRes.data);
        setLoadingClasses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!classId) {
        if (!cancelled) setEnrollments([]);
        return;
      }
      setLoadingEnrollments(true);
      const res = await api.get<EnrollmentItem[]>(`/api/enrollments?classId=${classId}`, token);
      if (!cancelled && res.success && res.data) setEnrollments(res.data);
      if (!cancelled) setLoadingEnrollments(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, token, reloadKey]);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!classId || !selectedStudentId) {
      setError('Select both a class and a student');
      return;
    }
    setSubmitting(true);
    const res = await api.post('/api/enrollments', { classId, studentId: selectedStudentId }, token);
    setSubmitting(false);
    if (res.success) {
      setSelectedStudentId('');
      setReloadKey((k) => k + 1);
    } else {
      setError(res.error ?? 'Failed to enroll student');
    }
  }

  async function handleUnenroll(id: string) {
    if (!confirm('Remove this student from the class?')) return;
    const res = await api.delete(`/api/enrollments/${id}`, token);
    if (res.success) {
      setReloadKey((k) => k + 1);
    } else {
      alert(res.error ?? 'Failed to remove enrollment');
    }
  }

  const enrolledIds = new Set(enrollments.map((e) => e.student.id));
  const availableStudents = students.filter((s) => !enrolledIds.has(s.id));

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink mb-6">Enrollments</h2>

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

      {!classId && (
        <EmptyState
          title="Select a class to manage enrollments"
          description="Choose a class from the dropdown above, or create one first if none exist yet."
        />
      )}

      {classId && (
        <>
          <form onSubmit={handleEnroll} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select a student…</option>
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-teal text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-dark disabled:opacity-50"
            >
              Enroll
            </button>
          </form>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {loadingEnrollments ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : enrollments.length === 0 ? (
            <EmptyState
              title="No students enrolled yet"
              description="Enroll a student above so they can see this class and check in from the mobile app."
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {enrollments.map((e) => (
                <div key={e.id} className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-900">{e.student.name}</div>
                    <div className="text-xs text-slate-400">
                      {e.student.email}{e.student.studentId ? ` · ${e.student.studentId}` : ''}
                    </div>
                  </div>
                  <button onClick={() => handleUnenroll(e.id)} className="text-xs text-red-600 hover:underline">
                    Remove
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