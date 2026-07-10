import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import EmptyState from '../components/EmptyState';
import Logo from '../components/Logo';

interface ScheduleItem {
  id: string;
  roomName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sessionOpen: boolean;
  class: { name: string };
}

interface RosterEvent {
  id: string;
  eventType: 'checkin' | 'checkout';
  timestamp: string;
  verificationOutcome: 'verified' | 'partial' | 'unverified';
  flagged: boolean;
  flagReasons: string[];
  teacherReviewed: boolean;
  teacherDecision: string | null;
  student: { name: string; studentId: string | null };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const OUTCOME_STYLE: Record<string, string> = {
  verified: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  unverified: 'bg-red-100 text-red-700',
};

export default function TeacherDashboard() {
  const { name, token, logout } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selected, setSelected] = useState<ScheduleItem | null>(null);
  const [roster, setRoster] = useState<RosterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.get<ScheduleItem[]>('/api/sessions/my-schedules', token);
      if (!cancelled && res.success && res.data) setSchedules(res.data);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  async function loadRoster(scheduleId: string) {
    const res = await api.get<RosterEvent[]>(`/api/sessions/${scheduleId}/roster`, token);
    if (res.success && res.data) setRoster(res.data);
  }

  function selectSchedule(schedule: ScheduleItem) {
    setSelected(schedule);
    loadRoster(schedule.id);
  }

  async function toggleSession() {
    if (!selected) return;
    setBusy(true);
    const action = selected.sessionOpen ? 'end' : 'start';
    const res = await api.post(`/api/sessions/${selected.id}/${action}`, {}, token);
    setBusy(false);
    if (res.success) {
      setReloadKey((k) => k + 1);
      setSelected((prev) => (prev ? { ...prev, sessionOpen: !prev.sessionOpen } : prev));
      loadRoster(selected.id);
    } else {
      alert(res.error ?? 'Action failed');
    }
  }

  async function review(eventId: string, decision: 'confirmed' | 'rejected') {
    setBusy(true);
    const res = await api.patch(`/api/sessions/events/${eventId}/review`, { decision }, token);
    setBusy(false);
    if (res.success && selected) {
      loadRoster(selected.id);
    } else {
      alert(res.error ?? 'Review failed');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-ink px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Logo variant="dark" size={20} />
          <span className="text-sm text-slate-400">Teacher — {name}</span>
        </div>
        <button onClick={logout} className="text-sm text-teal-light hover:underline">Log out</button>
      </header>

      <div className="flex">
        <aside className="w-72 bg-white border-r border-slate-200 min-h-[calc(100vh-65px)] p-4">
          <h2 className="text-xs font-semibold uppercase text-slate-400 mb-3">My schedules</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 px-2">
              <p className="text-sm font-medium text-slate-600 mb-1">No classes assigned yet</p>
              <p className="text-xs text-slate-400">
                Ask your admin to assign you as the teacher for a class and add a schedule for it.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {schedules.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => selectSchedule(s)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      selected?.id === s.id ? 'bg-teal/10 text-teal-dark' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-medium">{s.class.name}</div>
                    <div className="text-xs text-slate-400">
                      {DAY_NAMES[s.dayOfWeek]} {s.startTime}–{s.endTime} · {s.roomName}
                    </div>
                    <div className={`text-xs mt-1 ${s.sessionOpen ? 'text-green-600' : 'text-slate-400'}`}>
                      {s.sessionOpen ? '● Session open' : '○ Session closed'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="flex-1 p-8">
          {!selected ? (
            schedules.length === 0 ? (
              <EmptyState
                title="Nothing to manage yet"
                description="Once your admin assigns you a class and schedule, it will appear in the sidebar and you can start sessions from here."
              />
            ) : (
              <EmptyState
                title="Select a schedule"
                description="Choose a class from the sidebar to start a session and view its live roster."
              />
            )
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">{selected.class.name}</h2>
                  <p className="text-sm text-slate-500">{selected.roomName}</p>
                </div>
                <button
                  onClick={toggleSession}
                  disabled={busy}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
                    selected.sessionOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {selected.sessionOpen ? 'End session' : 'Start session'}
                </button>
              </div>

              <h3 className="text-sm font-semibold uppercase text-slate-400 mb-3">Live roster</h3>
              {roster.length === 0 ? (
                <EmptyState
                  title={selected.sessionOpen ? 'No check-ins yet' : 'Session is closed'}
                  description={
                    selected.sessionOpen
                      ? 'Students will appear here as soon as they check in.'
                      : 'Start the session above so enrolled students can check in.'
                  }
                />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {roster.map((event) => (
                    <div key={event.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-slate-900">{event.student.name}</div>
                        <div className="text-xs text-slate-400">
                          {event.eventType === 'checkin' ? 'Check in' : 'Check out'} ·{' '}
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                        {event.flagReasons.length > 0 && (
                          <div className="text-xs text-red-600 mt-1">{event.flagReasons.join(', ')}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {event.eventType === 'checkin' ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${OUTCOME_STYLE[event.verificationOutcome]}`}>
                            {event.verificationOutcome}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-slate-100 text-slate-500">
                            Recorded
                          </span>
                        )}

                        {event.eventType === 'checkin' && event.verificationOutcome !== 'verified' && !event.teacherReviewed && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => review(event.id, 'confirmed')}
                              disabled={busy}
                              className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => review(event.id, 'rejected')}
                              disabled={busy}
                              className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {event.eventType === 'checkin' && event.verificationOutcome !== 'verified' && event.teacherReviewed && (
                          <span className="text-xs text-slate-400 capitalize">{event.teacherDecision}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}