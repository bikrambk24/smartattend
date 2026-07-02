import { useAuth } from '../context/useAuth';

export default function AdminDashboard() {
  const { name, logout } = useAuth();
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Welcome, {name}</h1>
        <button onClick={logout} className="text-sm text-blue-600 hover:underline">Log out</button>
      </div>
      <p className="text-slate-500">Admin dashboard — coming next.</p>
    </div>
  );
}