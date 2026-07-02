import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import LoginScreen from './screens/LoginScreen';
import TeacherDashboard from './screens/TeacherDashboard';
import AdminDashboard from './screens/AdminDashboard';

function RootRoutes() {
  const { token, role, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {!token ? (
        <>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : role === 'admin' ? (
        <>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </>
      ) : (
        <>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="*" element={<Navigate to="/teacher" replace />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RootRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;