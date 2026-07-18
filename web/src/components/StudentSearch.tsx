import { useState, useEffect } from 'react';
import { api } from '../services/api';
import EmptyState from './EmptyState';

interface StudentListItem {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  isDisabled: boolean;
}

interface StudentHistoryItem {
  id: string;
  eventType: 'checkin' | 'checkout';
  timestamp: string;
  verificationOutcome: 'verified' | 'partial' | 'unverified';
  flagged: boolean;
  teacherReviewed: boolean;
  teacherDecision: string | null;
  schedule: { roomName: string; class: { name: string } };
}

interface StudentProfile {
  student: StudentListItem;
  history: StudentHistoryItem[];
}

const OUTCOME_STYLE: Record<string, string> = {
  verified: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  unverified: 'bg-red-100 text-red-700',
};

export default function StudentSearch({ token }: { token: string | null }) {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.get<StudentListItem[]>('/api/students', token);
      if (!cancelled && res.success && res.data) setStudents(res.data);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function selectStudent(id: string) {
    setSelectedId(id);
    setLoadingProfile(true);
    const res = await api.get<StudentProfile>(`/api/students/${id}`, token);
    if (res.success && res.data) setProfile(res.data);
    setLoadingProfile(false);
  }

  const filtered = students.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <div className="flex gap-6">
      <div className="w-72 shrink-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400">No students match.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => selectStudent(s.id)}
                className={`w-full text-left p-3 text-sm ${selectedId === s.id ? 'bg-teal/10' : 'hover:bg-slate-50'}`}
              >
                <div className={`font-medium ${s.isDisabled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {s.name}
                </div>
                <div className="text-xs text-slate-400">{s.email}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1">
        {!selectedId ? (
          <EmptyState
            title="Select a student"
            description="Search and choose a student from the list to view their profile and attendance history."
          />
        ) : loadingProfile || !profile ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <h3 className="font-display text-lg font-bold text-ink mb-1">{profile.student.name}</h3>
              <p className="text-sm text-slate-500">{profile.student.email}</p>
              {profile.student.studentId && (
                <p className="text-sm text-slate-500">Student ID: {profile.student.studentId}</p>
              )}
              {profile.student.isDisabled && <p className="text-sm text-red-600 mt-1">Account disabled</p>}
            </div>

            <h4 className="text-sm font-semibold uppercase text-slate-400 mb-3">Attendance history</h4>
            {profile.history.length === 0 ? (
              <EmptyState title="No attendance records" description="This student has no recorded check-ins yet." />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {profile.history.map((h) => {
                  const hasOverride = h.eventType === 'checkin' && h.teacherReviewed && h.teacherDecision;

                  return (
                    <div key={h.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-slate-900">{h.schedule.class.name}</div>
                        <div className="text-xs text-slate-400">
                          {h.eventType === 'checkin' ? 'Check in' : 'Check out'} · {h.schedule.roomName} ·{' '}
                          {new Date(h.timestamp).toLocaleString()}
                        </div>
                        {hasOverride && (
                          <div className="text-xs text-slate-400 mt-1">System check: {h.verificationOutcome}</div>
                        )}
                      </div>
                      {h.eventType === 'checkin' ? (
                        hasOverride ? (
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              h.teacherDecision === 'present'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {h.teacherDecision === 'present' ? 'Present' : 'Absent'}
                          </span>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${OUTCOME_STYLE[h.verificationOutcome]}`}>
                            {h.verificationOutcome}
                          </span>
                        )
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-slate-100 text-slate-500">
                          Recorded
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}